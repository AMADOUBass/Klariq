# CLAUDE.md — Klariq Agent Intelligence Rules

> This file is read by AI coding agents working in this repository.
> These rules are NON-NEGOTIABLE. They exist because violating them in a financial
> system causes real harm: data corruption, accounting errors, audit failures,
> regulatory penalties, and potential loss of client funds.

---

## HARD RULES — NEVER VIOLATE

### 1. Double-Entry Balance Invariant

**Every journal entry MUST satisfy: SUM(debit lines) === SUM(credit lines).**

- Enforce at the service layer before writing.
- Enforce at the DB layer via a CHECK constraint + trigger (Phase 2).
- If the entry does not balance, REJECT it. Never silently round or pad.
- Unbalanced entries are corruption. There are no exceptions.

### 2. Journal Entry Immutability

**A posted journal entry is IMMUTABLE. No UPDATE or DELETE — ever.**

Correction workflow:
1. Create a reversing entry that exactly negates the original (same amounts, swapped Dr/Cr).
2. Post the correcting entry with the correct amounts.
3. Both entries remain in the ledger permanently with a linked `reverses_id`.

Pending/draft entries may be edited before posting. Once `status = POSTED`, treat as stone.

### 3. No Soft Deletes on Financial Tables

**Financial tables do not have `deleted_at` or `is_deleted` columns.**

Allowed alternatives:
- `status = VOID` for cancelled invoices/bills
- Reversing journal entry for posted ledger corrections
- `superseded_by_id` for versioned documents

Rationale: soft deletes cause phantom balance calculations when a `WHERE deleted_at IS NULL`
clause is accidentally omitted. Immutability + void/reverse is unambiguous.

### 4. Every Tenant-Scoped Query MUST Filter by company_id

**No query on a tenant-scoped table may omit `WHERE company_id = $tenantId`.**

Not "most queries". Not "except this one-off report". EVERY query.

Tenant-scoped tables (Phase 2): Company, Account, FiscalPeriod, JournalEntry,
JournalLine, Invoice, InvoiceLine, Bill, BillLine, TaxRate, AuditLog.

Enforcement layers:
1. `AuthGuard` extracts `company_id` from the Better-Auth session + `X-Organization-Id` header.
2. `@CurrentTenant()` decorator injects it into service calls.
3. `TenantInterceptor` throws if a `@TenantScoped()` controller is hit without a context.
4. Postgres RLS will be added as a final safety net in Phase 2 (see SECURITY.md).

If you are writing a query and thinking "this is a system-level query that doesn't need the filter":
**stop, think again, and add the filter or move the query to an explicit admin-only context.**

### 5. Money Is Never a JavaScript Number

**Monetary values NEVER cross any system boundary as a `number` type.**

Rules:
- In memory: use the `Money` value object from `@klariq/shared` (wraps `decimal.js`).
- At API boundaries: string decimal — validated by `MoneySchema` (Zod).
- In Postgres: `NUMERIC(19,4)` — never `FLOAT`, `DOUBLE PRECISION`, or `REAL`.
- In JSON responses: `{ amount: "1234.5678", currency: "CAD" }` — amount is a string.
- In BullMQ job payloads: serialize `Money` to its DTO before enqueuing.

Violation example (WRONG):
```typescript
const total = invoice.subtotal + invoice.tax; // number arithmetic — FORBIDDEN
```

Correct:
```typescript
const total = Money.fromDTO(invoice.subtotal).add(Money.fromDTO(invoice.tax));
```

### 6. External Webhook Handlers Must Be Idempotent

**Every handler for an external webhook (Stripe, bank feeds, etc.) must:**

1. Check `processed_webhooks` table for `event_id` before processing.
2. If already processed: return 200 immediately (do not re-process).
3. If not processed: process inside a SERIALIZABLE transaction, then insert the `event_id`.

Schema (Phase 2):
```sql
CREATE TABLE processed_webhooks (
  event_id   TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider   TEXT NOT NULL
);
```

This prevents double-billing, duplicate journal entries, and race conditions when
webhook providers retry on timeout.

### 7. Financial Mutations Use SERIALIZABLE Transactions

**All writes to financial tables MUST use `withTransaction()` from `@klariq/db`.**

This uses `ISOLATION LEVEL SERIALIZABLE`. Do not downgrade to READ COMMITTED for mutations.

The cost (higher lock contention) is worth it. A lost-update on a journal entry or
a phantom read on period-close detection is unacceptable.

Read-only queries (reports, dashboards) may use `withReadonlyTransaction()`.

### 8. No Cross-Module Database Access

**Modules talk via service interfaces. No module imports another module's Prisma queries.**

Wrong:
```typescript
// InvoicingModule importing AccountingModule's internal repository
import { JournalEntryRepository } from '../accounting/internal/journal-entry.repository';
```

Correct:
```typescript
// InvoicingModule using AccountingModule's exported service
import { AccountingService } from '../accounting'; // public index only
```

The ESLint rule `no-restricted-imports` enforces this for internal paths.

### 9. Prisma Migrations on Financial Tables Require a Data-Consistency Test

**Before applying any migration that touches a financial table:**

1. Write a test proving existing data remains consistent after the migration.
2. Run the migration in a test environment with production-scale fixture data.
3. Never run `prisma migrate deploy` on financial tables in production without a rollback plan.

### 10. Tax Rates Are Time-Versioned — Resolve by Transaction Date

**NEVER use today's tax rate for a historical or future-dated transaction.**

A tax rate has an `effective_from` and `effective_to` date range.
Always resolve via: `WHERE effective_from <= :transaction_date AND (effective_to IS NULL OR effective_to >= :transaction_date)`.

Quebec GST/QST rates have changed historically. An invoice dated 2022 must use 2022 rates,
even if you're generating the PDF in 2026.

---

## ARCHITECTURE REMINDERS

### Module Boundary Map

```
identity  ──▶  (no dependencies)
tenancy   ──▶  identity
accounting ──▶ tenancy
ledger    ──▶  accounting (read-only)
invoicing ──▶  accounting, tenancy
reporting ──▶  ledger, invoicing
audit     ──▶  (no domain dependencies — observes all via interceptor)
```

Arrows mean "may call the public service interface of". No cycles allowed.

### Request Lifecycle (authenticated tenant request)

1. HTTP request arrives
2. Better-Auth middleware handles `/auth/*` routes (session management)
3. `AuthGuard` validates session cookie → extracts `userId`, `companyId`
4. `TenantInterceptor` verifies `@TenantScoped()` routes have a context
5. `AuditInterceptor` wraps the handler (logs mutations)
6. Controller calls domain service, passing `TenantContext`
7. Service calls `withTransaction()` → executes Prisma queries with `company_id` filter
8. Response serialised — money amounts as strings, never numbers

### Phase 2 Checklist (before writing any domain code)

- [ ] Add Prisma models following DATABASE.md invariants
- [ ] Run `prisma migrate dev` against a local Neon branch
- [ ] Add `company_id` index on every tenant-scoped table
- [ ] Add DB CHECK constraint for double-entry balance on JournalEntry
- [ ] Add Postgres trigger for AuditLog on JournalEntry mutations
- [ ] Add Postgres RLS policies (see SECURITY.md)
- [ ] Enable `processed_webhooks` table before wiring any external webhooks
- [ ] Add TaxRate seed data with correct GST/QST history

---

## SENTRY INTEGRATION POINTS (Phase 2)

Sentry SDK is NOT installed yet. Integration points are marked with:
```typescript
// SENTRY: captureException(error) here
```

Do NOT add ad-hoc `console.error` in place of Sentry. Mark the hook point and
install the SDK properly in Phase 2 with source maps, environment tagging, and
performance tracing.

---

## MONEY QUICK REFERENCE

```typescript
// Create
const price = Money.of('100.0000', 'CAD');
const zero  = Money.zero('CAD');

// Arithmetic
const total = price.add(tax).add(shipping);
const net   = revenue.subtract(cogs);

// Validation at API boundary (Zod)
const dto = MoneySchema.parse(req.body.amount); // throws if not { amount: string, currency: string }
const m   = Money.fromDTO(dto);

// Serialise for response
res.json({ amount: m.toJSON() }); // { amount: "100.0000", currency: "CAD" }

// Persist to Prisma (NUMERIC column expects string in Prisma)
await prisma.invoiceLine.create({ data: { total: m.amount.toFixed(4) } });
```

---

*Last updated: 2026-04-28 — Phase 1 scaffolding*
