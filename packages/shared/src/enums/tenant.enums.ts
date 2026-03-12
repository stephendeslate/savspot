import { z } from 'zod';

export const BusinessCategory = z.enum([
  'VENUE',
  'SALON',
  'STUDIO',
  'FITNESS',
  'PROFESSIONAL',
  'OTHER',
]);
export type BusinessCategory = z.infer<typeof BusinessCategory>;

export const PaymentProviderType = z.enum(['STRIPE', 'ADYEN', 'PAYPAL', 'OFFLINE', 'GCASH', 'MAYA', 'RAZORPAY', 'MOLLIE', 'DLOCAL']);
export type PaymentProviderType = z.infer<typeof PaymentProviderType>;

export const SubscriptionTier = z.enum(['FREE', 'PREMIUM', 'ENTERPRISE']);
export type SubscriptionTier = z.infer<typeof SubscriptionTier>;

export const TenantStatus = z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
export type TenantStatus = z.infer<typeof TenantStatus>;

export const SubscriptionStatus = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'TRIALING',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const SlotInsightType = z.enum([
  'HIGH_DEMAND_SLOT',
  'LOW_FILL_SLOT',
  'CANCELLATION_PATTERN',
]);
export type SlotInsightType = z.infer<typeof SlotInsightType>;
