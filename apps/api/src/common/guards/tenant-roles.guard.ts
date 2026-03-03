import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TENANT_ROLES_KEY,
  TenantRoleType,
} from '../decorators/tenant-roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
  tenantRole?: string;
}

/**
 * Guard that checks whether the authenticated user has one of the
 * required tenant roles set by the @TenantRoles() decorator.
 *
 * Resolves the tenant ID from (in order of priority):
 *   1. Route param `:tenantId` (e.g. /tenants/:tenantId/services)
 *   2. Route param `:id` when controller path is /tenants/:id
 *   3. JWT payload `tenantId`
 *
 * Looks up the TenantMembership record for the user + tenant pair
 * and checks the membership role against the required roles.
 */
@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      TenantRoleType[] | undefined
    >(TENANT_ROLES_KEY, [context.getHandler(), context.getClass()]);

    // No @TenantRoles() decorator means no tenant role restriction
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || (!user.id && !user.sub)) {
      throw new UnauthorizedException('Authentication required');
    }

    const userId = user.sub ?? user.id;

    // Resolve tenant ID: route params take precedence over JWT payload
    const params = request.params as Record<string, string> | undefined;
    const tenantId =
      params?.['tenantId'] ?? params?.['id'] ?? user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Look up the membership from the database
    const membership = await this.prismaService.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    const hasRole = requiredRoles.includes(
      membership.role as TenantRoleType,
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient tenant permissions');
    }

    // Set the tenant context on the request for downstream use
    (request.user as AuthenticatedUser).tenantId = tenantId;
    (request.user as AuthenticatedUser).tenantRole = membership.role;

    return true;
  }
}
