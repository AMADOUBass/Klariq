import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../context/tenant.context';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles restricted for this route
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.tenantContext?.role;

    if (!userRole) {
      throw new ForbiddenException('Role not found in tenant context');
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(`Access restricted. Requires one of: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
