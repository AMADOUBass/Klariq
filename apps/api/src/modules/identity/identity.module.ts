import { Module } from '@nestjs/common';

/**
 * IdentityModule — Phase 2
 *
 * Responsibilities:
 *  - User profile management (display name, avatar, locale preference)
 *  - Email verification flow
 *  - Password change / reset (delegates to Better-Auth)
 *  - User invitation acceptance
 *
 * Phase 2 exports: IdentityService (for other modules to resolve user info)
 */
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
