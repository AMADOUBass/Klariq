# Klariq

Cloud accounting for Quebec businesses. Built on NestJS + Next.js, designed for thousands of tenants.

> Phase 1: Scaffolding — the foundation boots but contains no business logic yet.
> See [ROADMAP.md](ROADMAP.md) for what's coming.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20.11 | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | ≥ 9.0 | `npm install -g pnpm@9` |
| Docker | any recent | Required for integration tests (Testcontainers) |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/klariq.git
cd klariq

# 2. Install all dependencies
pnpm install

# 3. Set up environment variables
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edit both files with your actual credentials (see Environment Variables section)

# 4. Generate Prisma client
pnpm db:generate

# 5. Run Better-Auth migrations (creates auth tables in your Postgres)
pnpm auth:migrate

# 6. Run database migrations (currently a no-op — schema is empty in Phase 1)
pnpm db:migrate

# 7. Start both apps in development mode
pnpm dev
```

The API will be available at `http://localhost:4000`
The web app will be available at `http://localhost:3000`

---

## Environment Variables

### apps/api/.env

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require&pgbouncer=true
DATABASE_DIRECT_URL=postgresql://user:pass@host/dbname?sslmode=require
REDIS_URL=rediss://default:password@hostname.upstash.io:6380
BETTER_AUTH_SECRET=your-secret-minimum-32-characters
WEB_URL=http://localhost:3000
```

### apps/web/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Getting credentials

- **Postgres (Neon)**: Create a project at [neon.tech](https://neon.tech), choose `ca-central-1` region.
  Copy the pooled connection string to `DATABASE_URL` and the direct connection string to `DATABASE_DIRECT_URL`.

- **Redis (Upstash)**: Create a Redis database at [upstash.com](https://upstash.com).
  Choose `Canada` region. Copy the `REDIS_URL` (use the `rediss://` TLS URL).

- **BETTER_AUTH_SECRET**: Generate with `openssl rand -base64 32`

---

## Development Commands

```bash
# Start all apps (web + api) concurrently
pnpm dev

# Build all packages and apps
pnpm build

# Run all linters
pnpm lint

# Run TypeScript type checking
pnpm typecheck

# Run smoke tests
pnpm test

# Format all files
pnpm format

# Database
pnpm db:generate    # regenerate Prisma client after schema changes
pnpm db:migrate     # create + apply a new migration (dev only)
pnpm db:studio      # open Prisma Studio (visual DB editor)

# Individual apps
pnpm --filter @klariq/api dev
pnpm --filter @klariq/web dev
```

---

## Running Tests

```bash
# All smoke tests (no external dependencies required)
pnpm test

# Watch mode
pnpm --filter @klariq/api test:watch
pnpm --filter @klariq/web test:watch

# Integration tests (requires Docker — starts ephemeral Postgres via Testcontainers)
pnpm --filter @klariq/api test:integration
```

---

## Project Structure

```
klariq/
├── apps/
│   ├── api/          NestJS API (port 4000)
│   └── web/          Next.js frontend (port 3000)
├── packages/
│   ├── shared/       Shared Zod schemas + Money value object
│   ├── config/       Shared ESLint, TypeScript, Prettier configs
│   └── db/           Prisma schema + client singleton
├── docs/
│   ├── CLAUDE.md     AI agent rules (read this before writing any code)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   ├── DECISIONS.md
│   └── ROADMAP.md
└── .github/
    └── workflows/ci.yml
```

---

## Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Auth | Better-Auth (self-hosted) | Data residency (Quebec Loi 25), no per-seat cost |
| ORM | Prisma | Versioned migration history is a compliance artifact |
| API framework | NestJS | DI, Guards, Interceptors, module isolation |
| Architecture | Modular monolith | Double-entry invariant needs atomic transactions |
| Database | Neon Postgres (ca-central-1) | Canadian data residency, serverless, branching |
| Queue | BullMQ + Upstash Redis | Idempotent job processing, retries, job history |
| Money | decimal.js + NUMERIC(19,4) | IEEE 754 floats are not safe for financial math |

See [DECISIONS.md](DECISIONS.md) for full ADR-style rationale.

---

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) — the hard rules that must never be violated.
2. Create a feature branch from `main`.
3. Ensure `pnpm lint && pnpm typecheck && pnpm test` all pass.
4. Open a PR — CI will run automatically.
5. No `any` types, no JS numbers for money, no soft deletes on financial tables.
