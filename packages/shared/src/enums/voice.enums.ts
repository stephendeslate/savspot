import { z } from 'zod';

export const VoiceCallDirection = z.enum(['INBOUND', 'OUTBOUND']);
export type VoiceCallDirection = z.infer<typeof VoiceCallDirection>;

export const VoiceCallStatus = z.enum([
  'RINGING',
  'IN_PROGRESS',
  'COMPLETED',
  'BUSY',
  'NO_ANSWER',
  'FAILED',
]);
export type VoiceCallStatus = z.infer<typeof VoiceCallStatus>;

export const VoiceIntent = z.enum([
  'AVAILABILITY_CHECK',
  'BOOK_APPOINTMENT',
  'CANCEL_BOOKING',
  'GENERAL_QUESTION',
  'TRANSFER_REQUEST',
  'UNKNOWN',
]);
export type VoiceIntent = z.infer<typeof VoiceIntent>;
