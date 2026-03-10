import { z } from 'zod';

export const DiscountType = z.enum(['PERCENTAGE', 'FIXED', 'FREE_HOURS']);
export type DiscountType = z.infer<typeof DiscountType>;

export const DiscountApplication = z.enum(['AUTOMATIC', 'CODE_REQUIRED', 'ADMIN_ONLY']);
export type DiscountApplication = z.infer<typeof DiscountApplication>;
