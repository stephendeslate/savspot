import { z } from 'zod';

export const NoteEntityType = z.enum(['BOOKING', 'CLIENT']);
export type NoteEntityType = z.infer<typeof NoteEntityType>;
