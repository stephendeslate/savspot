import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PermissionSet,
  PermissionResource,
  ROLE_DEFAULTS,
  FULL_PERMISSIONS,
} from './permissions.constants';

type PartialPermissionSet = {
  [R in PermissionResource]?: Partial<PermissionSet[R]>;
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getEffectivePermissions(membership: {
    role: string;
    permissions: unknown;
  }): PermissionSet {
    const basePerms = ROLE_DEFAULTS[membership.role] ?? FULL_PERMISSIONS;

    if (!membership.permissions) {
      return JSON.parse(JSON.stringify(basePerms)) as PermissionSet;
    }

    const overrides = membership.permissions as PartialPermissionSet;
    return this.mergePermissions(basePerms, overrides);
  }

  hasPermission(
    membership: { role: string; permissions: unknown },
    resource: PermissionResource,
    action: string,
  ): boolean {
    const effective = this.getEffectivePermissions(membership);
    const resourcePerms = effective[resource] as Record<string, boolean> | undefined;
    if (!resourcePerms) return false;
    return resourcePerms[action] === true;
  }

  async getEffectivePermissionsForMember(
    tenantId: string,
    userId: string,
  ): Promise<PermissionSet> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, permissions: true },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    return this.getEffectivePermissions(membership);
  }

  async updatePermissions(
    tenantId: string,
    userId: string,
    overrides: PartialPermissionSet,
  ): Promise<PermissionSet> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      select: { role: true, permissions: true },
    });

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    const basePerms = ROLE_DEFAULTS[membership.role] ?? FULL_PERMISSIONS;
    this.validateOverridesNarrowOnly(basePerms, overrides);

    await this.prisma.tenantMembership.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { permissions: overrides as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(
      `Permissions updated for user ${userId} in tenant ${tenantId}`,
    );

    return this.mergePermissions(basePerms, overrides);
  }

  private mergePermissions(
    base: PermissionSet,
    overrides: PartialPermissionSet,
  ): PermissionSet {
    const result = JSON.parse(JSON.stringify(base)) as PermissionSet;

    for (const resource of Object.keys(overrides) as PermissionResource[]) {
      const overrideResource = overrides[resource];
      if (!overrideResource) continue;

      const baseResource = result[resource] as Record<string, boolean> | undefined;
      if (!baseResource) continue;

      for (const [action, value] of Object.entries(overrideResource)) {
        if (typeof value !== 'boolean') continue;
        // Overrides can only narrow (set true to false), never expand
        if (baseResource[action] === true && value === false) {
          baseResource[action] = false;
        }
      }
    }

    return result;
  }

  private validateOverridesNarrowOnly(
    base: PermissionSet,
    overrides: PartialPermissionSet,
  ): void {
    for (const resource of Object.keys(overrides) as PermissionResource[]) {
      const overrideResource = overrides[resource];
      if (!overrideResource) continue;

      const baseResource = base[resource] as Record<string, boolean> | undefined;
      if (!baseResource) {
        throw new BadRequestException(
          `Unknown permission resource: ${resource}`,
        );
      }

      for (const [action, value] of Object.entries(overrideResource)) {
        if (!(action in baseResource)) {
          throw new BadRequestException(
            `Unknown permission action: ${resource}.${action}`,
          );
        }
        if (typeof value !== 'boolean') {
          throw new BadRequestException(
            `Permission value must be boolean: ${resource}.${action}`,
          );
        }
        if (baseResource[action] === false && value === true) {
          throw new BadRequestException(
            `Cannot expand permissions beyond role defaults: ${resource}.${action}`,
          );
        }
      }
    }
  }
}
