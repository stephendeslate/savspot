import { z } from 'zod';

export const ContractStatus = z.enum([
  'DRAFT',
  'SENT',
  'PARTIALLY_SIGNED',
  'SIGNED',
  'EXPIRED',
  'VOID',
  'AMENDED',
]);
export type ContractStatus = z.infer<typeof ContractStatus>;

export const SignatureType = z.enum(['DRAWN', 'TYPED', 'UPLOADED']);
export type SignatureType = z.infer<typeof SignatureType>;

export const SignerRole = z.enum([
  'CLIENT',
  'WITNESS',
  'COMPANY_REP',
  'GUARDIAN',
  'PARTNER',
  'OTHER',
]);
export type SignerRole = z.infer<typeof SignerRole>;

export const AmendmentStatus = z.enum([
  'REQUESTED',
  'DRAFT',
  'SENT_FOR_REVIEW',
  'APPROVED',
  'SIGNED',
  'REJECTED',
  'CANCELLED',
]);
export type AmendmentStatus = z.infer<typeof AmendmentStatus>;
