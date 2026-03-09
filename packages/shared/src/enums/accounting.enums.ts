import { z } from 'zod';

export const AccountingProvider = z.enum(['QUICKBOOKS', 'XERO']);
export type AccountingProvider = z.infer<typeof AccountingProvider>;

export const AccountingConnectionStatus = z.enum(['ACTIVE', 'DISCONNECTED', 'ERROR']);
export type AccountingConnectionStatus = z.infer<typeof AccountingConnectionStatus>;
