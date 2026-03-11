import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  REQUIRES_TIER_KEY,
  REQUIRES_FEATURE_KEY,
  SubscriptionTierType,
} from '../decorators/requires-feature.decorator';
import { TIER_FEATURES, FeatureKey } from '../../subscriptions/entitlements';
import { Request } from 'express';

interface AuthenticatedUser {
  sub?: string;
  id: string;
  tenantId?: string;
}

const TIER_HIERARCHY: Record<SubscriptionTierType, number> = {
  FREE: 0,
  PREMIUM: 1,
  ENTERPRISE: 2,
};

@Injectable()
export class FeatureEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<
      SubscriptionTierType | undefined
    >(REQUIRES_TIER_KEY, [context.getHandler(), context.getClass()]);

    const requiredFeature = this.reflector.getAllAndOverride<
      FeatureKey | undefined
    >(REQUIRES_FEATURE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredTier && !requiredFeature) {
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

    const currentTier = tenant.subscriptionTier as SubscriptionTierType;

    if (requiredTier) {
      const currentLevel = TIER_HIERARCHY[currentTier];
      const requiredLevel = TIER_HIERARCHY[requiredTier];

      if (currentLevel < requiredLevel) {
        throw new ForbiddenException(
          `This feature requires a ${requiredTier} subscription or higher. Current tier: ${currentTier}`,
        );
      }
    }

    if (requiredFeature) {
      const features = TIER_FEATURES[currentTier];
      const featureValue = features[requiredFeature];

      if (featureValue === false || featureValue === 0) {
        throw new ForbiddenException(
          `The "${requiredFeature}" feature is not available on the ${currentTier} tier. Please upgrade your subscription.`,
        );
      }
    }

    return true;
  }
}
