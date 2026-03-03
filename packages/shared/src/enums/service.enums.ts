import { z } from 'zod';

export const PricingModel = z.enum(['FIXED', 'HOURLY', 'TIERED', 'CUSTOM']);
export type PricingModel = z.infer<typeof PricingModel>;

export const PricingUnit = z.enum(['PER_EVENT', 'PER_PERSON', 'PER_HOUR']);
export type PricingUnit = z.infer<typeof PricingUnit>;

export const ConfirmationMode = z.enum(['AUTO_CONFIRM', 'MANUAL_APPROVAL']);
export type ConfirmationMode = z.infer<typeof ConfirmationMode>;
