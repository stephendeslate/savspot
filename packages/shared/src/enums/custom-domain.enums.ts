import { z } from 'zod';

export const CustomDomainStatus = z.enum([
  'PENDING_VERIFICATION',
  'DNS_VERIFIED',
  'SSL_PROVISIONING',
  'ACTIVE',
  'VERIFICATION_FAILED',
  'SSL_FAILED',
  'SUSPENDED',
]);
export type CustomDomainStatus = z.infer<typeof CustomDomainStatus>;

export const SslStatus = z.enum([
  'PENDING',
  'ISSUING',
  'ACTIVE',
  'RENEWAL_PENDING',
  'EXPIRED',
  'FAILED',
]);
export type SslStatus = z.infer<typeof SslStatus>;
