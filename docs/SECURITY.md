# Klariq — Security

## Authentication Model

### Better-Auth (Self-Hosted)

Klariq uses Better-Auth with the following configuration:

| Aspect | Choice | Rationale |
|---|---|---|
| Password hashing | Argon2id via `@node-rs/argon2` | OWASP recommended, resistant to GPU attacks |
| Session storage | Postgres (`ba_session` table) | Auditable, survives process restarts |
| Session expiry | 7 days (sliding) | Balance between UX and security |
| 2FA | TOTP via authenticator apps (optional) | Optional in Phase 1, enforced for admins in Phase 2 |
| Cookie | HttpOnly, Secure, SameSite=Lax | Prevents XSS session theft, allows CORS |

### Organization-Based Access

Better-Auth's `organization` plugin maps to Klariq's tenant concept:
- Each `Organization` = one `Company` in the Klariq domain
- A user can be a member of multiple organizations (multiple companies)
- The active organization is communicated via the `X-Organization-Id` request header
- Phase 2 will validate membership and resolve role/permissions from the DB

---

## Tenant Isolation Strategy

### Layer 1: Application Guard (AuthGuard)

The `AuthGuard` runs on every authenticated request:
1. Validates the Better-Auth session cookie
2. Reads `X-Organization-Id` header
3. Sets `req.tenantContext = { userId, companyId, userEmail }`

If either the session or the organization header is missing, the request is rejected
with `401 Unauthorized` before reaching any controller.

### Layer 2: Tenant Interceptor

The `TenantInterceptor` enforces that `@TenantScoped()` controllers always have
a tenant context, even if a future developer accidentally removes `AuthGuard`.

### Layer 3: Service Layer Filter

Every Prisma query on a tenant-scoped table includes `WHERE company_id = $tenantId`.
The `@CurrentTenant()` decorator makes this ergonomic:

```typescript
async list(@CurrentTenant() { companyId }: TenantContext) {
  return this.prisma.invoice.findMany({ where: { companyId } });
}
```

### Layer 4: Postgres Row-Level Security (Phase 2)

RLS will be enabled on all tenant-scoped tables as a final defense-in-depth layer.
Even if all three application layers have bugs, the database rejects cross-tenant reads.

```sql
-- Phase 2 pattern (applied to every tenant-scoped table)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invoices
  USING (company_id = current_setting('app.company_id')::uuid);

-- Set at the start of each transaction
SET LOCAL app.company_id = '...';
```

**Important:** RLS is a Phase 2 addition. Until it is enabled, the application-layer
guards are the primary isolation mechanism. Do not skip the `company_id` filter
because "RLS will handle it" — RLS is not enabled yet.

---

## Secrets Management

### Environment Variables

All secrets are validated at boot via `@t3-oss/env-core` Zod schemas. The app refuses
to start if any required secret is missing or malformed.

| Secret | Where Used | Rotation Policy |
|---|---|---|
| `DATABASE_URL` | Prisma / Better-Auth | Rotate via Neon console, redeploy |
| `DATABASE_DIRECT_URL` | Prisma migrations only | Same as above |
| `REDIS_URL` | BullMQ | Rotate via Upstash console, redeploy |
| `BETTER_AUTH_SECRET` | Session signing | Rotate = all sessions invalidated |

### Secret Rules

1. **Never commit secrets to git.** `.env` is in `.gitignore`. `.env.example` contains only
   placeholder values.
2. **Never log secrets.** Pino is configured to not log the `env` object.
3. **Use different secrets per environment.** Dev, staging, and production each have
   their own credentials.
4. **Minimum key lengths:** `BETTER_AUTH_SECRET` ≥ 32 characters (enforced by Zod).

---

## Rate Limiting Plan (Phase 2)

Phase 2 will add rate limiting at the NestJS middleware level using `@nestjs/throttler`
or a Redis-backed rate limiter:

| Endpoint group | Limit | Window |
|---|---|---|
| Auth (sign-in, sign-up) | 10 requests | 1 minute per IP |
| Auth (password reset) | 3 requests | 15 minutes per email |
| API (authenticated) | 300 requests | 1 minute per user |
| Webhook ingest | 1000 requests | 1 minute per source IP |

Rate limit counters are stored in Redis (Upstash) for persistence across restarts.

---

## Audit Log Strategy

Every mutation to a financial record generates an audit log entry.
See DATABASE.md for the schema. The audit log satisfies:

- **Who**: `actor_id` (user) + `company_id` (tenant)
- **What**: `action` (e.g., `invoice.voided`) + `entity_type` + `entity_id`
- **When**: `created_at` timestamp (UTC)
- **Before/After**: full JSON snapshots for forensic review
- **How**: `ip_address` + `user_agent`

The audit log is **append-only** — no UPDATE or DELETE is possible.

---

## Quebec Loi 25 / Data Residency

Quebec's *Loi 25* (Law 25) establishes requirements for personal information handling
that apply to Klariq as a SaaS processing business financial data.

### Key obligations:

1. **Data residency**: All tenant data is stored in Neon Postgres (ca-central-1, AWS Canada).
   Redis (Upstash) queue data is ephemeral — only job payloads (no PII by default).

2. **Breach notification**: Breaches affecting sensitive personal information must be
   reported to the Commission d'accès à l'information (CAI) within 72 hours.

3. **Right to access / deletion**: Users may request their personal data.
   The `audit_log` is retained per-company and deleted when a company is terminated.
   Better-Auth session and account data is deleted on user account deletion.

4. **Consent**: Explicit consent required for personal data collection beyond what is
   strictly necessary for the service. Marketing emails require opt-in.

5. **Privacy officer**: Phase 2 will document a privacy officer role and contact.

### Data stored in Canada (ca-central-1):
- Postgres (Neon): all financial and personal data
- Redis (Upstash): configure to Canada region — verify in Upstash console

### Data that may leave Canada:
- Error reports (Sentry — configure to use Canadian data center or self-host)
- Analytics (if added — evaluate data residency of chosen tool)
- Email delivery (Resend / AWS SES — email content transits providers)

---

## CORS Configuration

The API allows requests only from the configured `WEB_URL` origin:

```typescript
app.enableCors({
  origin: env.WEB_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
});
```

In production, `WEB_URL` must be the exact frontend origin (e.g., `https://app.klariq.com`).
Wildcard origins (`*`) are never acceptable for a credentialed API.

---

## Security Headers (Phase 2)

Phase 2 will add security headers via Next.js config and NestJS Helmet:

- `Content-Security-Policy` (Next.js)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- HSTS (via hosting platform / Cloudflare)
