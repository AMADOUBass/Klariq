import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { auth } from '../../auth/auth.config';
import type { TenantContext, AuthenticatedRequest } from '../context/tenant.context';

import { PrismaService } from '../database/prisma.service';

/**
 * AuthGuard validates the Better-Auth session cookie on every request.
 *
 * On success it writes a TenantContext onto the request object, which is then
 * accessible via the @CurrentTenant() decorator in controller methods.
 *
 * Organization resolution:
 *   The client sends the active organization ID in the X-Organization-Id header.
 *   Phase 2 will validate that the user is actually a member of that org
 *   and resolve their role/permissions from the database.
 *
 * Usage:
 *   Apply globally via APP_GUARD or per-module:
 *   @UseGuards(AuthGuard)
 *   @Controller('invoices')
 *   export class InvoiceController { ... }
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    }

    const session = await auth.api.getSession({ headers }).catch(() => null);

    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const companyId = req.headers['x-organization-id'];
    if (!companyId || typeof companyId !== 'string') {
      throw new UnauthorizedException(
        'X-Organization-Id header is required for authenticated requests',
      );
    }

    // Verify membership and extract role
    const member = await this.prisma.client.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: companyId,
      },
      select: { role: true },
    });

    if (!member) {
      throw new UnauthorizedException('You do not have access to this organization');
    }

    const tenantContext: TenantContext = {
      userId: session.user.id,
      companyId,
      userEmail: session.user.email,
      role: member.role,
    };

    (req as AuthenticatedRequest).tenantContext = tenantContext;
    return true;
  }
}
