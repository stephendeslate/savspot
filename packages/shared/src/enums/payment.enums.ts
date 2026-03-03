import { z } from 'zod';

export const PaymentStatus = z.enum([
  'CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'DISPUTED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentType = z.enum(['DEPOSIT', 'FULL_PAYMENT', 'INSTALLMENT', 'REFUND']);
export type PaymentType = z.infer<typeof PaymentType>;

export const InvoiceStatus = z.enum([
  'DRAFT',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const DisputeReason = z.enum(['DUPLICATE', 'FRAUDULENT', 'PRODUCT_UNACCEPTABLE', 'OTHER']);
export type DisputeReason = z.infer<typeof DisputeReason>;

export const DisputeStatus = z.enum(['OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED']);
export type DisputeStatus = z.infer<typeof DisputeStatus>;
