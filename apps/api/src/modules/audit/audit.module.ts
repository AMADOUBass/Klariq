import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * AuditModule — Phase 2
 *
 * Responsibilities:
 *  - Persist AuditLog records for all financial mutations
 *  - Expose audit trail API for compliance queries
 *  - Dual strategy: app interceptor (this module) + Postgres triggers
 *
 * AuditLog schema (Phase 2):
 *  id, company_id, actor_id, action, entity_type, entity_id,
 *  before JSONB, after JSONB, ip_address, user_agent, created_at
 *
 * IMMUTABILITY: AuditLog rows are append-only. No UPDATE or DELETE is
 * ever permitted on this table. Enforced via Postgres trigger in Phase 2.
 *
 * Phase 2 exports: AuditService
 */
@Module({
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
