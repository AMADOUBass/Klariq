import { createParamDecorator, type ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import type { TenantContext, AuthenticatedRequest } from '../context/tenant.context';

/**
 * Parameter decorator that extracts the TenantContext from the request.
 *
 * Usage:
 *   @Get('invoices')
 *   listInvoices(@CurrentTenant() tenant: TenantContext) { ... }
 *
 * Throws InternalServerErrorException if TenantContext is not set,
 * which indicates AuthGuard was not applied to the route.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.tenantContext) {
      throw new InternalServerErrorException(
        'TenantContext not found on request — ensure AuthGuard is applied.',
      );
    }
    return request.tenantContext;
  },
);
