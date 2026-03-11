import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

export type SubscriptionTierLevel = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export const REQUIRED_TIER_KEY = 'requiredTier';

export const RequireTier = (tier: SubscriptionTierLevel) =>
  SetMetadata(REQUIRED_TIER_KEY, tier);

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
}

const TIER_HIERARCHY: Record<SubscriptionTierLevel, number> = {
  FREE: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

@Injectable()
export class SubscriptionTierGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<
      SubscriptionTierLevel | undefined
    >(REQUIRED_TIER_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    const params = request.params as Record<string, string> | undefined;
    const tenantId =
      params?.['tenantId'] ?? params?.['id'] ?? user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const tenant = await this.prismaService.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionTier: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const currentTier = tenant.subscriptionTier as SubscriptionTierLevel;
    const currentLevel = TIER_HIERARCHY[currentTier];
    const requiredLevel = TIER_HIERARCHY[requiredTier];

    if (currentLevel < requiredLevel) {
      throw new ForbiddenException(
        `This feature requires a ${requiredTier} subscription or higher. Current tier: ${currentTier}`,
      );
    }

    return true;
  }
}
