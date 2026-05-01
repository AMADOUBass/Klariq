# Klariq — Architecture Decision Records

ADR format: each decision records the context, the choice, the alternatives, and the rationale.

---

## ADR-001: Better-Auth over Clerk (2026-04-28)

**Status:** Accepted

**Context:**
Klariq handles financial data for Quebec businesses. Auth is a critical component.
The two main options evaluated were Clerk (managed SaaS) and Better-Auth (self-hosted).

**Decision:** Better-Auth (self-hosted, Postgres adapter)

**Rationale:**

| Factor | Clerk | Better-Auth |
|---|---|---|
| Data residency | Stores user data in Clerk's US infrastructure | User data stored in our Neon Postgres (Canada) |
| Pricing | Per-seat ($0.02/MAU) — scales linearly with users | One-time integration cost only |
| Multi-tenancy | Organizations available on paid plan | Organizations plugin included |
| Framework coupling | React-first SDK; NestJS support is unofficial | Framework-agnostic with Node.js handler |
| Quebec Loi 25 | Problematic — user PII stored on foreign servers | Compliant — all data in Canada |
| Customisation | Limited | Full control — schema, plugins, email templates |
| Argon2id | Clerk manages password hashing (SHA-256-based flow) | Explicit argon2id configuration |
| 2FA | Available | twoFactor plugin available |

The data residency concern is the deciding factor. Quebec's Loi 25 makes storing user PII on
foreign servers legally complex for a Quebec-focused product. Better-Auth keeps all data in
our own Postgres instance.

**Trade-off:** Better-Auth requires more upfront integration work and ongoing maintenance
of the auth schema. Clerk would have been faster to ship. We accept this cost.

---

## ADR-002: Prisma over Drizzle (2026-04-28)

**Status:** Accepted

**Context:**
Two TypeScript ORMs were evaluated: Prisma and Drizzle.

**Decision:** Prisma with `$queryRaw` escape hatch available

**Rationale:**

| Factor | Drizzle | Prisma |
|---|---|---|
| Migration safety | Schema-first, no explicit migration history | Explicit migration files, versioned history |
| Type safety | Excellent (SQL-like API) | Good (slightly less granular) |
| Raw SQL | First-class SQL | `$queryRaw` available |
| Financial schema control | Good | Excellent — migration history is auditable |
| Community/ecosystem | Growing | Mature, large ecosystem |
| Multi-tenant patterns | Manual | Manual |

For an accounting system, **migration history is a compliance artifact**. Prisma's
migration files are named, timestamped, and checked into git. This creates an auditable
record of every schema change — critical for financial software.

The `$queryRaw` escape hatch is explicitly noted here: use it for complex reporting
queries that Prisma's query builder cannot express efficiently (e.g., recursive CTEs for
account tree queries, window functions for aging reports). Do not use it as a workaround
for missing features in day-to-day CRUD.

**Trade-off:** Prisma is slightly slower than Drizzle for simple queries and has higher
memory usage. For an SMB SaaS with thousands (not millions) of queries/second, this
is acceptable. We revisit if latency becomes a bottleneck.

---

## ADR-003: NestJS over Next.js API Routes (2026-04-28)

**Status:** Accepted

**Context:**
Should the API be built as Next.js API routes (co-located with the frontend) or as a
separate NestJS process?

**Decision:** Separate NestJS process

**Rationale:**

Next.js API routes are serverless functions. They work well for simple CRUD but lack:
- Dependency injection (no way to share stateful services)
- Interceptors and Guards (manual middleware chaining)
- Module isolation enforcement
- Lifecycle hooks (`onModuleDestroy` for Redis cleanup)
- Structured module boundaries

NestJS provides all of these. For a multi-tenant financial app where:
- Every request needs AuthGuard + TenantInterceptor + AuditInterceptor
- Services need to share database connections
- Modules must not cross-import
- Background job workers need to co-locate with business logic

...a structured server framework is the right choice.

**Trade-off:** Two separate deployments (web on Vercel, api on Fly.io/Railway).
Slightly more complex infrastructure. The module isolation and DI benefits outweigh this.

---

## ADR-004: Modular Monolith over Microservices (2026-04-28)

**Status:** Accepted

**Context:**
How should the backend be split as it grows?

**Decision:** Modular monolith — one NestJS process with enforced module boundaries

**Rationale:**

The core accounting invariant — `SUM(debits) === SUM(credits)` — requires that creating
a journal entry be an **atomic transaction**. In microservices, this becomes a distributed
saga with compensating transactions, which introduces multiple failure modes:
- Service A posts the entry, Service B fails to update the invoice status → inconsistent state
- Network partition during saga → manual reconciliation required
- Distributed tracing required to debug failures

In a modular monolith, this is a single `withTransaction(() => { ... })` call.

**Extraction policy:** When a specific module needs independent scaling (most likely
`reporting` due to heavy queries), we extract it to a separate read-replica reader.
The module boundary is already drawn; extraction is a planned refactor, not emergency surgery.

---

## ADR-005: Neon PostgreSQL over PlanetScale / Supabase / RDS (2026-04-28)

**Status:** Accepted

**Decision:** Neon Postgres (ca-central-1)

**Rationale:**

| Factor | PlanetScale | Supabase | RDS | Neon |
|---|---|---|---|---|
| Canadian region | No | ca-central-1 | ca-central-1 | ca-central-1 |
| Postgres compatibility | MySQL (Vitess) | Full | Full | Full |
| Branching for dev | Yes | No | No | Yes |
| Serverless | Yes | No | No | Yes |
| Prisma support | Limited (no FKs) | Full | Full | Full |
| RLS support | No | Yes | Yes | Yes |

PlanetScale is MySQL — our entire schema design assumes Postgres (RLS, `NUMERIC`, triggers).
Supabase adds an opinionated layer on top of Postgres that we don't need.
RDS requires managing EC2 resources.

Neon provides: serverless Postgres, database branching (dev branches = isolated migration testing),
Canadian region, and PgBouncer pooling — exactly what we need.

---

## ADR-006: decimal.js for In-Memory Money Math (2026-04-28)

**Status:** Accepted

**Decision:** `decimal.js` wrapped by the `Money` value object in `@klariq/shared`

**Rationale:**

JavaScript `number` (IEEE 754 double-precision float) cannot represent most decimal fractions:
```
0.1 + 0.2 === 0.30000000000000004  // true in JavaScript
```

For financial software this is catastrophic. `decimal.js` provides arbitrary-precision
decimal arithmetic. The `Money` VO wraps it so:
1. No code outside `money.ts` touches `Decimal` directly
2. The boundary contract (string decimal at APIs, `NUMERIC(19,4)` in DB) is enforced
3. Currency mismatch throws rather than silently producing wrong results

**Alternatives considered:**
- `dinero.js` v2: good library but more opinionated; `decimal.js` gives us more control
- `bignumber.js`: similar to `decimal.js`; `decimal.js` has better ROUND_HALF_UP support
- Native `BigInt` with cent arithmetic: requires knowing the currency's subunit in advance;
  multi-currency makes this awkward

---

## ADR-007: BullMQ + Upstash Redis over AWS SQS (2026-04-28)

**Status:** Accepted

**Decision:** BullMQ with Upstash Redis (serverless Redis)

**Rationale:**

BullMQ provides:
- Delayed jobs (retry with exponential backoff)
- Job prioritisation
- Concurrency control per queue
- Job history (completed / failed)
- IORedis-compatible (works with Upstash)

SQS is simpler but:
- No job history
- No backoff without Step Functions
- Adds AWS SDK dependency
- Harder to run locally (needs `moto` or `elasticmq`)

Upstash Redis is serverless (pay per request) and runs in ca-central-1,
which keeps queue data in Canada.

**Idempotency contract:** Every job payload includes an `idempotencyKey`.
Processors check a `processed_jobs` table before processing (Phase 2).
This ensures at-least-once delivery with exactly-once business-logic execution.
