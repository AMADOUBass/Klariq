# Klariq — Architecture

## Architectural Style: Modular Monolith

Klariq is a **modular monolith** — a single deployable unit internally partitioned into
well-bounded modules with enforced dependency rules. This is a deliberate choice, not a
lack of ambition.

### Why Not Microservices?

| Concern | Microservices | Modular Monolith (Klariq) |
|---|---|---|
| Accounting transactions | Distributed sagas across services | Single SERIALIZABLE DB transaction |
| Operational complexity | Service discovery, network retries, distributed tracing | One process, one deploy, pino logs |
| Team size | Requires multiple autonomous teams | Appropriate for a 1–5 person founding team |
| Double-entry invariant | Hard to enforce across service boundaries | Enforced in one transaction |
| Refactoring | Breaking changes = API versioning | Module boundary is a TypeScript interface |

The double-entry accounting invariant — `SUM(debits) === SUM(credits)` — is trivial to
enforce in a single database transaction and almost impossible to enforce correctly
across distributed services without two-phase commit, which introduces its own failure modes.

When the business reaches a scale where specific modules need independent scaling,
the module boundaries are already drawn. Extracting a service is a planned refactor,
not an emergency surgery.

---

## Module Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP Layer (NestJS + Express)                              │
│  AuthMiddleware → AuthGuard → TenantInterceptor             │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐    ┌───────────┐    ┌───────────────┐
   │identity │    │  tenancy  │    │   reporting   │
   └────┬────┘    └─────┬─────┘    └───────┬───────┘
        │               │                  │ (read-only)
        │         ┌─────▼─────┐    ┌───────▼───────┐
        │         │accounting │    │    ledger     │
        │         └─────┬─────┘    └───────────────┘
        │               │
        │         ┌─────▼─────┐
        │         │ invoicing │
        │         └───────────┘
        │
   ┌────▼──────────────────────┐
   │  audit (cross-cutting)    │
   │  observes via interceptor │
   └───────────────────────────┘

   ┌───────────────────────────┐
   │  queues (BullMQ/Redis)    │
   │  used by invoicing, etc.  │
   └───────────────────────────┘
```

**Dependency rule:** arrows point toward lower-level modules. A module may only import
from a module that is lower on the dependency graph, and only via its `index.ts` public
export. No circular dependencies.

---

## Request Lifecycle

### Unauthenticated (auth routes)

```
Client → POST /auth/sign-in/email
       → AuthMiddleware detects /auth/* path
       → toNodeHandler(auth) delegates to Better-Auth
       → Better-Auth verifies credentials, sets session cookie
       → 200 OK + Set-Cookie
```

### Authenticated tenant request

```
Client → GET /api/invoices
  (Cookie: better-auth.session + X-Organization-Id: org_xxx)

1. AuthGuard.canActivate()
   ├── Builds Headers object from Express req
   ├── auth.api.getSession({ headers }) → validates session cookie
   ├── Reads X-Organization-Id header
   └── Sets req.tenantContext = { userId, companyId, userEmail }

2. TenantInterceptor.intercept()
   └── @TenantScoped() routes: verifies req.tenantContext exists

3. AuditInterceptor.intercept()
   └── Wraps handler execution, logs actor/action/duration

4. InvoicingController.list(@CurrentTenant() tenant)
   └── Passes tenant.companyId to InvoicingService

5. InvoicingService.list(companyId)
   └── prisma.invoice.findMany({ where: { companyId } })

6. Response serialised
   └── Money amounts as { amount: "string", currency: "CAD" }
```

---

## Infrastructure Topology

```
                    ┌──────────────────────────────┐
                    │  Vercel (or Fly.io)           │
                    │  apps/web  (Next.js 15)       │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────┐
                    │  Fly.io (or Railway)          │
                    │  apps/api  (NestJS 11)        │
                    └──┬──────────────────────┬────┘
                       │                      │
         ┌─────────────▼──────┐   ┌───────────▼────────┐
         │  Neon PostgreSQL   │   │  Upstash Redis      │
         │  (ca-central-1)    │   │  (BullMQ queues)    │
         │  PgBouncer pooling │   └────────────────────┘
         └────────────────────┘
```

---

## Technology Rationale Summary

See DECISIONS.md for full ADR-style rationale. Short version:

- **NestJS over Next.js API routes**: NestJS provides DI, Guards, Interceptors, and
  module isolation that are essential for a multi-tenant financial app. Next.js API routes
  are stateless functions; NestJS modules are structured domains.

- **Prisma over Drizzle**: Prisma migrations are safer for financial schemas. The
  `$queryRaw` escape hatch exists when needed for complex reporting queries.

- **Better-Auth over Clerk**: Self-hosted, no per-seat pricing, data stays in our Postgres
  (Quebec Loi 25 / data residency). Full control over the auth schema.

- **Modular monolith over microservices**: The double-entry invariant requires atomic
  transactions. Distributed sagas introduce failure modes that are unacceptable for accounting.
