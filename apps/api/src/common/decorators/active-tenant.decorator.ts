import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../context/tenant.context';

/**
 * Parameter decorator to inject the current TenantContext.
 * 
 * Usage:
 *   @Get()
 *   async findAll(@ActiveTenant() tenant: TenantContext) { ... }
 */
export const ActiveTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tenantContext;
  },
);
