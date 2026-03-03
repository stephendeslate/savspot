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

export const PaymentProviderType = z.enum(['STRIPE', 'ADYEN', 'PAYPAL', 'OFFLINE']);
export type PaymentProviderType = z.infer<typeof PaymentProviderType>;

export const SubscriptionTier = z.enum(['FREE', 'PREMIUM', 'ENTERPRISE']);
export type SubscriptionTier = z.infer<typeof SubscriptionTier>;

export const TenantStatus = z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
export type TenantStatus = z.infer<typeof TenantStatus>;
