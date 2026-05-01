# Klariq — Database Design

## Core Principles

### 1. Immutable Ledger

The `journal_entries` and `journal_lines` tables are **append-only** once posted.

- No `UPDATE` on posted journal entries — enforced by a Postgres trigger in Phase 2.
- No `DELETE` on financial tables — ever. See CLAUDE.md rule 3.
- Corrections happen via reversing entries: a new entry that negates the original,
  followed by a correcting entry with the right values.

### 2. Double-Entry Invariant — Enforced at Two Layers

**Layer 1: Application (AccountingService)**
```typescript
const debitSum = lines
  .filter(l => l.type === 'DEBIT')
  .reduce((acc, l) => acc.add(Money.fromDTO(l.amount)), Money.zero('CAD'));

const creditSum = lines
  .filter(l => l.type === 'CREDIT')
  .reduce((acc, l) => acc.add(Money.fromDTO(l.amount)), Money.zero('CAD'));

if (!debitSum.equals(creditSum)) {
  throw new Error(`Unbalanced entry: debits ${debitSum} ≠ credits ${creditSum}`);
}
```

**Layer 2: Database (Postgres trigger)**
```sql
-- Phase 2: add this trigger to journal_entries
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  debit_sum  NUMERIC;
  credit_sum NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'), 0),
         COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0)
  INTO debit_sum, credit_sum
  FROM journal_lines
  WHERE journal_entry_id = NEW.id;

  IF debit_sum <> credit_sum THEN
    RAISE EXCEPTION 'Unbalanced journal entry: debits=% credits=%', debit_sum, credit_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Two layers = defence in depth. The app check gives a user-friendly error message.
The DB trigger prevents corruption even if the app has a bug.

### 3. Money Storage

All monetary columns use `NUMERIC(19,4)`:
- 19 digits of precision (max ~999 trillion — more than enough for SMB)
- 4 decimal places (covers most world currencies including JPY exception handling)
- Never `FLOAT`, `DOUBLE PRECISION`, or `REAL` — these have rounding errors

Prisma schema pattern (Phase 2):
```prisma
model JournalLine {
  amount   Decimal @db.Decimal(19, 4)
  currency String  @db.Char(3)         // ISO 4217
}
```

In Prisma, `Decimal` maps to `NUMERIC` in Postgres and returns a `Prisma.Decimal`
object (which wraps `decimal.js`). Always convert to our `Money` VO at the service layer.

### 4. Multi-Currency From Day One

Every monetary column stores:
- `amount NUMERIC(19,4)` — the value in the transaction's original currency
- `currency CHAR(3)` — ISO 4217 code
- `amount_cad NUMERIC(19,4)` — the CAD-equivalent at the time of posting (functional currency)
- `exchange_rate NUMERIC(10,6)` — the rate applied

This avoids the pain of retrofitting currency into a single-currency schema.

### 5. Period Close Mechanism

```
FiscalPeriod.status:
  OPEN   → entries can be posted
  CLOSED → read-only (no new postings, but existing entries remain queryable)
  LOCKED → even reporting users cannot see unapproved adjustments

Transition rules:
  OPEN → CLOSED: requires reconciliation check (no unmatched bank transactions)
  CLOSED → LOCKED: requires manager approval
  LOCKED → OPEN: FORBIDDEN (contact support — requires data integrity review)
```

### 6. Connection Pooling for Serverless

Neon Postgres with PgBouncer (session mode) requires:
```
DATABASE_URL=postgresql://...?connection_limit=1&pool_timeout=20&pgbouncer=true
```

The `connection_limit=1` is critical for serverless functions — each serverless invocation
gets exactly one connection from the pool. Without it, you exhaust connections under load.

`DATABASE_DIRECT_URL` bypasses PgBouncer and is used only for:
- `prisma migrate deploy`
- `prisma db push`
- Schema introspection

### 7. Multi-Tenancy Indexing Strategy

Every tenant-scoped table has a compound index on `(company_id, ...)`:

```sql
-- Example (Phase 2)
CREATE INDEX idx_journal_entries_company_date
  ON journal_entries (company_id, posted_at DESC);

CREATE INDEX idx_invoices_company_status
  ON invoices (company_id, status, due_date);
```

The `company_id` is always the leading column so the planner can use the index
for tenant-scoped queries without a full table scan.

### 8. Audit Log Strategy

Dual-layer audit trail:
1. **App-level** (`AuditInterceptor`): captures full before/after payload in JSON.
   Good for user-facing audit trail queries.
2. **DB-level** (Postgres triggers): captures row-level changes at the database.
   Survives app bugs, direct DB writes, and batch operations.

Planned `audit_log` schema (Phase 2):
```sql
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL,
  actor_id     UUID NOT NULL,
  action       TEXT NOT NULL,         -- 'invoice.created', 'journal.posted', etc.
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  before       JSONB,
  after        JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: prevent UPDATE/DELETE via trigger
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

### 9. Migration Workflow

```bash
# Development (creates migration file + applies it)
pnpm db:migrate

# Production (applies existing migration files — CI/CD only)
pnpm --filter @klariq/db exec prisma migrate deploy

# Inspect current state
pnpm db:studio

# Reset dev database (DESTRUCTIVE — dev only)
pnpm --filter @klariq/db exec prisma migrate reset
```

**Before any migration touching a financial table:**
1. Snapshot production data to a test environment.
2. Write a test proving data consistency post-migration.
3. Create a rollback migration.
4. Apply during off-peak hours.
5. Monitor for 30 minutes after applying.

### 10. Planned Phase 2 Schema Map

```
Company (tenant root)
├── UserProfile (extends Better-Auth user)
├── FiscalPeriod (open/closed/locked)
├── Account (chart of accounts — tree via parent_id)
│   └── AccountType: ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
├── JournalEntry (immutable once posted)
│   └── JournalLine[] (debit/credit pairs)
├── TaxRate (time-versioned)
│   └── TaxRatePeriod[] (effective_from, effective_to, rate)
├── Invoice (AR)
│   └── InvoiceLine[]
├── Bill (AP)
│   └── BillLine[]
├── AuditLog (append-only)
└── ProcessedWebhook (idempotency table)
```
