import { z } from 'zod';

export const DirectorySortOrder = z.enum(['relevance', 'rating', 'distance']);
export type DirectorySortOrder = z.infer<typeof DirectorySortOrder>;
