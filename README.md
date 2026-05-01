# Klariq — Multi-Tenant Accounting Platform

Klariq is a high-integrity, multi-tenant accounting platform designed as a **modular monolith**. It provides a robust double-entry accounting engine with built-in multi-tenancy, audit trails, and financial reporting.

## 🏗️ Architecture & Philosophy

Klariq is built with a focus on data integrity and strict accounting principles:
- **Modular Monolith**: Enforced boundaries between domains (Identity, Tenancy, Accounting, Ledger, Invoicing) while maintaining a single deployable unit.
- **Double-Entry Invariant**: Every journal entry must balance. This is enforced at the service layer and the database layer.
- **Immutability**: Posted journal entries are immutable. Corrections are handled via reversing entries.
- **Multi-Tenancy**: Strict isolation between companies using tenant-scoped queries and Postgres RLS.

## 🛠️ Technology Stack

- **Monorepo**: [Turborepo](https://turbo.build/) with `npm` workspaces.
- **Backend**: [NestJS](https://nestjs.com/) (Modular API).
- **Frontend**: [Next.js](https://nextjs.org/) with Tailwind CSS and Framer Motion.
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/).
- **Auth**: [Better-Auth](https://www.better-auth.com/) for multi-tenant identity and session management.
- **Background Jobs**: [BullMQ](https://docs.bullmq.io/) with Redis.
- **Infrastructure**: Designed for Fly.io/Railway (API) and Vercel (Web).

## 📂 Repository Structure

```text
├── apps
│   ├── api          # NestJS backend
│   └── web          # Next.js frontend
├── packages
│   ├── db           # Prisma schema and client
│   ├── shared       # Zod schemas, Money value object, types
│   └── config       # Shared ESLint, Prettier, and TS configs
├── docs             # Technical documentation (Architecture, Roadmap, etc.)
└── docker-compose.yml # Local development infrastructure (Postgres, Redis)
```

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 20.11.0
- Docker (for local DB and Redis)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` in the root and in relevant apps, then fill in the required variables.

### 4. Infrastructure
Start the local database and Redis:
```bash
npm run docker:up
```

### 5. Database Initialization
Generate the Prisma client and run migrations:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 6. Development
Start both the API and Web apps in development mode:
```bash
npm run dev
```

## 📚 Documentation

For more detailed information, refer to the documents in the `docs/` folder:
- [Architecture](file:///docs/ARCHITECTURE.md): Deep dive into the modular monolith design.
- [Roadmap](file:///docs/ROADMAP.md): Project milestones and current progress.
- [CLAUDE.md](file:///docs/CLAUDE.md): Non-negotiable rules for AI agents and developers.
- [Security](file:///docs/SECURITY.md): Multi-tenancy and data protection strategy.

## ⚖️ License

Private / Confidential — All rights reserved.
