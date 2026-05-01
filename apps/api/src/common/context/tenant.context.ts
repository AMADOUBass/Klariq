/**
 * TenantContext is injected into every authenticated request by AuthGuard.
 * It is the single source of truth for the active tenant within a request lifecycle.
 *
 * Phase 2: add role, permissions, subscription plan, feature flags.
 */
export interface TenantContext {
  /** Better-Auth user ID */
  readonly userId: string;
  /** Better-Auth organization ID — maps to Company.id in Phase 2 */
  readonly companyId: string;
  readonly userEmail: string;
  /** User's role within the active organization */
  readonly role: string;
}

/** Express request augmented with tenant context */
export interface AuthenticatedRequest extends Request {
  tenantContext: TenantContext;
}
