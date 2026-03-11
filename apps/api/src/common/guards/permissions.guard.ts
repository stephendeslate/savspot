import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/requires-permission.decorator';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { PermissionResource } from '../../auth/permissions/permissions.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
  tenantRole?: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || (!user.id && !user.sub)) {
      throw new UnauthorizedException('Authentication required');
    }

    const userId = user.sub ?? user.id;

    const params = request.params as Record<string, string> | undefined;
    const tenantId =
      params?.['tenantId'] ?? params?.['id'] ?? user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const membership = await this.prismaService.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, TRUE)`;
      return tx.tenantMembership.findUnique({
        where: {
          tenantId_userId: { tenantId, userId },
        },
        select: { role: true, permissions: true },
      });
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    const hasPermission = this.permissionsService.hasPermission(
      membership,
      required.resource as PermissionResource,
      required.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    (request.user as AuthenticatedUser).tenantId = tenantId;
    (request.user as AuthenticatedUser).tenantRole = membership.role;

    return true;
  }
}
