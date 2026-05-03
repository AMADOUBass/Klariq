# Klariq — Roadmap

## Phase 1: Scaffolding (Current — April 2026)

**Goal:** A clean monorepo foundation that boots without errors. No business logic.

- [x] Turborepo + pnpm workspaces
- [x] NestJS API with `/health` endpoint
- [x] Next.js web with FR/EN locale routing
- [x] Better-Auth (email/password + organizations + 2FA) — configured, not migrated
- [x] Prisma schema (datasource + generator only)
- [x] BullMQ + Redis wiring (welcome-email queue proves connectivity)
- [x] `Money` value object with Decimal.js
- [x] `MoneySchema` Zod validation at boundaries
- [x] Shared Zod schemas in `@klariq/shared`
- [x] Env var validation at boot (`@t3-oss/env-core`)
- [x] Multi-tenancy scaffolding (AuthGuard, TenantInterceptor, @CurrentTenant)
- [x] Audit interceptor stub
- [x] Module stubs: identity, tenancy, accounting, ledger, invoicing, reporting, audit
- [x] Vitest smoke tests passing
- [x] Strict TypeScript (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
- [x] Documentation: CLAUDE.md, ARCHITECTURE.md, DATABASE.md, SECURITY.md, DECISIONS.md
- [x] CI workflow (lint + typecheck + test on PR)
- [x] Git repository initialization and GitHub remote setup

---

## Infrastructure & Final Features (Target: Tomorrow)

**Goal:** Establish the production environment and finalize core role-based access.

- [ ] **Infrastructure Setup**
    - [x] **Database (Neon)**: Create project, set up branches, configure env vars.
    - [x] **Redis (Upstash)**: Create instance, configure `REDIS_URL`.
    - [x] **Backend (Fly.io)**: Initialize app, set up Dockerfile, configure secrets.
    - [ ] **Frontend (Vercel)**: Connect GitHub, configure build, set up domain.
- [ ] **RBAC & Permissions (Phase 5.1 Finalization)**
    - [ ] **Accountant Role**: Define and integrate the 'accountant' role in API decorators.
    - [ ] **Access Mapping**: Update `AccountingController` and `InvoicingController` to allow 'accountant' access to reports/read-only views.
    - [ ] **Invitation Flow**: Ensure the UI/API invitation flow supports the new roles.

---

## Phase 2: Domain Core (Target: Q2 2026)

**Goal:** A working double-entry accounting engine with multi-tenancy.

### 2.1 Database Schema

- [x] Run `npx better-auth migrate` → create Better-Auth tables
- [x] `Company` model (tenant root — linked to Better-Auth organization)
- [x] `UserProfile` model (extends Better-Auth user)
- [x] `Account` model — chart of accounts (tree via `parent_id`, account types)
- [x] `FiscalPeriod` model — with open/closed/locked state machine
- [x] `JournalEntry` + `JournalLine` models — with double-entry CHECK constraint
- [x] `TaxRate` + `TaxRatePeriod` models — GST (5%), QST (9.975%), custom
- [x] `AuditLog` model — append-only, no UPDATE/DELETE trigger
- [x] `ProcessedWebhook` table — idempotency for external webhooks
- [x] Postgres RLS on all tenant-scoped tables
- [x] Indexes: `(company_id, ...)` compound on every tenant-scoped table

### 2.2 Identity Module

- [x] User profile CRUD (display name, avatar, locale)
- [x] Email verification flow
- [x] Company onboarding (name, legal structure, GST/QST numbers, fiscal year start)
- [x] Member invitation (email → Better-Auth invitation → role assignment)

### 2.3 Accounting Module

- [x] Chart of accounts API (create, update, archive — no delete)
- [x] Default chart of accounts seed (Quebec standard: IFRS-adjacent)
- [x] Journal entry creation with balance validation
- [x] Journal entry posting (status: DRAFT → POSTED)
- [x] Reversing entry workflow
- [x] Period open/close API (with reconciliation check)

### 2.4 Ledger Module

- [x] Account balance calculation (SUM of journal lines per account per period)
- [x] Trial balance report
- [x] Balance sheet (assets = liabilities + equity)
- [x] Income statement (revenue - expenses)

### 2.5 Invoicing Module

- [x] Customer (contact) model
- [x] Invoice CRUD (draft → sent → paid | void)
- [x] Invoice posting → automatic journal entry creation
- [x] GST/QST tax line calculation (resolved by invoice date)
- [x] Bill (AP) CRUD with approval workflow
- [x] Bill payment → journal entry

### 2.6 Audit Module

- [x] Persist AuditLog row on every financial mutation (via AuditInterceptor)
- [x] Postgres trigger on `journal_entries` (DB-level audit)
- [x] Audit trail API (paginated, filterable by actor/entity)

### 2.7 Testing

- [x] Integration test suite with Testcontainers (real Postgres)
- [x] Journal entry balance invariant tests
- [x] Multi-tenancy isolation tests (verify no cross-tenant data leakage)
- [x] Period close state machine tests

---

## Phase 3: Features (Target: Q3 2026)

**Goal:** User-facing features that make Klariq competitive with QuickBooks/Xero.

### 3.1 Frontend: Dashboard

- [x] shadcn/ui component library (install + configure)
- [x] Auth pages (sign-in, sign-up, forgot password)
- [x] Company onboarding wizard
- [x] Dashboard (cash position, AR aging, AP aging, YTD P&L)
- [x] do the complete auth to nnect and protect entire site and access to user companies

### 3.2 Frontend: Invoicing

- [x] Invoice list + create/edit form
- [x] Customer management
- [x] Invoice line items with tax calculation
- [x] Bill management

### 3.3 PDF Generation
- [x] Client-side PDF generation via `@react-pdf/renderer`
- [x] Export invoice and bill to PDF
- [x] Real-time PDF preview in dashboard
- [ ] (Optional) Background PDF generation + S3/R2 storage for automated emails

### 3.4 Email
- [x] Welcome email (welcome-email queue)
- [x] Invoice sent email (with PDF attachment support)
- [x] Payment received confirmation trigger
- [x] Provider: Resend (configured)

### 3.5 Bank Import
- [x] CSV import (generic bank statement format)
- [x] Transaction matching (auto-match to open invoices/bills)
- [x] Manual categorisation UI (Frontend Banking Dashboard)

### 3.6 Multi-currency Support
- [x] Auto-fetch exchange rates (Bank of Canada API)
- [x] Database caching for historical rates
- [x] Realized/Unrealized Gain/Loss report logic
- [x] Currency selection in Invoices/Bills

### 3.7 Stripe Integration
- [x] Stripe service and initialization
- [x] Webhook ingest with rawBody signature verification
- [x] Idempotency table integration (ProcessedWebhook)
- [x] Payment intent → invoice payment reconciliation

### 4.2 Financial Statements
- [x] Profit & Loss (P&L) real-time report
- [x] Balance Sheet (Asset, Liability, Equity)
- [x] Cash Flow Statement

### 4.3 Company Profile & Customization
- [x] Company settings (Address, Logo, Legal info)
- [x] Tax number configuration (GST/QST)
- [x] Invoice template customization

### 4.4 Audit Trail & Advanced Security
- [x] Audit logs dashboard (UI for tracking all changes)
- [x] 2FA (Two-Factor Authentication) enablement
- [x] Data export (Full ledger backup)

### 5.1 Multi-user Roles & Permissions
- [ ] Role-based access control (Owner, Admin, Accountant)
    - [ ] Integrate 'accountant' role in NestJS `@Roles` decorators.
    - [ ] Map granular permissions (Accountant can view reports but not edit company settings).
- [ ] External accountant access (read-only / review)
    - [ ] Invitation flow with specific read-only scope for external audits.

### 5.2 AI Automations (Final Polish)
- [ ] Receipt scanning (OCR via AWS Textract/Tesseract)
- [ ] AI-powered transaction categorisation
- [ ] Intelligent cash flow forecasting

---

## Post-Launch Milestones

### 2027
- [ ] Bank connection via Flinks (Canadian bank feeds)
- [ ] Multi-entity (consolidated financial statements)
- [ ] SOC 2 Type II preparation
- [ ] Public API + Webhooks

---

## Project Improvements & Hardening

**Goal:** Strengthen the platform for production-grade reliability and security.

### 🛡️ Security & Integrity
- [ ] **Postgres Row Level Security (RLS)**: Implement RLS policies as a final safety net for multi-tenancy.
- [ ] **Ledger Sealing**: Cryptographically sign journal entries to prevent database-level tampering.
- [ ] **Penetration Testing**: Audit the Auth and Tenancy guards for edge-case leaks.

### ⚡ Performance & Monitoring
- [ ] **Sentry Integration**: Add global error tracking and tracing across apps.
- [ ] **Request Idempotency**: Implement `X-Idempotency-Key` for critical financial mutations.
- [ ] **Caching**: Implement Redis caching for exchange rates and report summaries.

### 💎 UX & Automation
- [ ] **Automated Backups**: Scheduled export of the full ledger to secure S3/R2 storage.
- [ ] **Bank Feed Automation**: Integrate Flinks or Plaid for real-time bank statement synchronization.
- [ ] **AI Categorization**: Train a simple model to suggest account codes based on transaction descriptions.

---

## 💡 Brainstorming & Futures Idées (À réfléchir)

**Objectif :** Explorer les prochaines étapes pour transformer Klariq en leader du marché.

### 🎨 UI/UX Premium
- [ ] **Thémanisation Complète** : Support natif Dark/Light mode avec palettes professionnelles.
- [ ] **Command Bar (⌘+K)** : Navigation ultra-rapide et exécution d'actions au clavier.
- [ ] **Collaboration Live** : Indicateurs de présence et curseurs partagés sur les rapports.
- [ ] **Portail White-Label** : Personnalisation de l'interface client (Logo/Couleurs) pour les factures.

### ⚙️ Backend & Intelligence
- [ ] **Détection d'Anomalies (IA)** : Alertes automatiques sur les écritures inhabituelles ou erreurs potentielles.
- [ ] **Versioning de Documents** : Historique immuable de chaque modification sur les factures et devis.
- [ ] **Webhooks Sortants** : Intégrations avec Zapier/Make pour automatiser des workflows externes.
- [ ] **Rate Limiting & Quotas** : Protection avancée de l'API pour les usages intensifs.

### 🚀 Business Features
- [ ] **Comptabilité par Projet** : Suivi de rentabilité granulaire lié aux projets clients.
- [ ] **Amortissement des Actifs** : Calcul auto de la dépréciation des immobilisations (Équipement/Matériel).
- [ ] **Paiement par Lien Magique** : Paiement simplifié pour les clients finaux sans authentification.
- [ ] **Budgétisation & Prévisionnel** : Comparaison Réel vs Budget et projection de trésorerie.
