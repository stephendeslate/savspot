import { SetMetadata } from '@nestjs/common';
import type { FeatureKey } from '../../subscriptions/entitlements';

export type SubscriptionTierType = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export const REQUIRES_TIER_KEY = 'requiresTier';
export const REQUIRES_FEATURE_KEY = 'requiresFeature';

export const RequiresTier = (tier: SubscriptionTierType) =>
  SetMetadata(REQUIRES_TIER_KEY, tier);

export const RequiresFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRES_FEATURE_KEY, feature);
