import { z } from 'zod';

export const PartnerType = z.enum(['REFERRAL', 'INTEGRATION', 'RESELLER']);
export type PartnerType = z.infer<typeof PartnerType>;

export const PartnerStatus = z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'TERMINATED']);
export type PartnerStatus = z.infer<typeof PartnerStatus>;

export const PartnerTier = z.enum(['STANDARD', 'SILVER', 'GOLD']);
export type PartnerTier = z.infer<typeof PartnerTier>;

export const PartnerReferralStatus = z.enum(['PENDING', 'ACTIVATED', 'QUALIFIED', 'CHURNED']);
export type PartnerReferralStatus = z.infer<typeof PartnerReferralStatus>;

export const PayoutStatus = z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED']);
export type PayoutStatus = z.infer<typeof PayoutStatus>;
