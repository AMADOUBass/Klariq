import { Module } from '@nestjs/common';

/**
 * TenancyModule — Phase 2
 *
 * Responsibilities:
 *  - Company (tenant) creation and configuration
 *  - Member management (invite, remove, change role)
 *  - Subscription plan enforcement
 *  - Tenant-level feature flags
 *  - Fiscal year configuration (start month, currency)
 *
 * Phase 2 exports: TenancyService (for resolving company settings in other modules)
 *
 * Multi-tenancy invariant:
 *  Every query touching a tenant-scoped table MUST include a `company_id` filter.
 *  The TenantInterceptor + @CurrentTenant() decorator enforce this at the API layer.
 *  Postgres RLS will be added as a defense-in-depth layer (see docs/SECURITY.md).
 */
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';

@Module({
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
