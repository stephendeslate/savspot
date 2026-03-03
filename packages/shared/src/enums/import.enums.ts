import { z } from 'zod';

export const SourcePlatform = z.enum([
  'BOOKSY',
  'FRESHA',
  'SQUARE',
  'VAGARO',
  'MINDBODY',
  'CSV_GENERIC',
  'JSON_GENERIC',
]);
export type SourcePlatform = z.infer<typeof SourcePlatform>;

export const ImportType = z.enum(['CLIENTS', 'SERVICES', 'APPOINTMENTS', 'FULL']);
export type ImportType = z.infer<typeof ImportType>;

export const ImportJobStatus = z.enum([
  'PENDING',
  'MAPPING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);
export type ImportJobStatus = z.infer<typeof ImportJobStatus>;

export const ImportRecordStatus = z.enum(['IMPORTED', 'SKIPPED_DUPLICATE', 'ERROR']);
export type ImportRecordStatus = z.infer<typeof ImportRecordStatus>;
