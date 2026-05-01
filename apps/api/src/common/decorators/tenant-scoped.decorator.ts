import { SetMetadata } from '@nestjs/common';

export const TENANT_SCOPED_KEY = 'TENANT_SCOPED' as const;

/**
 * Marks a controller or route handler as tenant-scoped.
 * The TenantInterceptor enforces that a valid TenantContext exists on the request.
 *
 * Apply at the controller level for all routes, or per-route for selective enforcement.
 *
 * Usage:
 *   @TenantScoped()
 *   @Controller('invoices')
 *   export class InvoiceController { ... }
 */
export const TenantScoped = (): ClassDecorator & MethodDecorator =>
  SetMetadata(TENANT_SCOPED_KEY, true);
