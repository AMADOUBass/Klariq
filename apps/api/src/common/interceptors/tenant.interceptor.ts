import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { TENANT_SCOPED_KEY } from '../decorators/tenant-scoped.decorator';
import type { AuthenticatedRequest } from '../context/tenant.context';

/**
 * TenantInterceptor enforces that tenant-scoped endpoints always have a TenantContext.
 *
 * This is a defense-in-depth layer on top of AuthGuard. Even if a future developer
 * accidentally removes AuthGuard from a tenant-scoped controller, this interceptor
 * prevents the request from reaching the handler.
 *
 * Register globally in AppModule:
 *   { provide: APP_INTERCEPTOR, useClass: TenantInterceptor }
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(TENANT_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isTenantScoped) {
      const req = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();
      if (!req.tenantContext) {
        throw new UnauthorizedException(
          'This endpoint requires an active tenant context. ' +
            'Ensure AuthGuard is applied and X-Organization-Id is provided.',
        );
      }
    }

    return next.handle();
  }
}
