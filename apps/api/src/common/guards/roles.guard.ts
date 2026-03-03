import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PlatformRoleType } from '../decorators/roles.decorator';
import { Request } from 'express';

/**
 * Guard that checks whether the authenticated user has one of the
 * required platform roles set by the @Roles() decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      PlatformRoleType[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // No @Roles() decorator means no role restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { platformRole?: string } | undefined;

    if (!user || !user.platformRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasRole = requiredRoles.includes(
      user.platformRole as PlatformRoleType,
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
