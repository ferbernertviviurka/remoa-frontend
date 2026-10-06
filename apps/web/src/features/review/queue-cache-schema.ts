import { queueItemSchema } from '@remoa/contracts';
import { z } from 'zod';

// P-507 (D-1070): loaded only when a saved queue is read, so zod stays out of /revisar's initial JS.
export const savedSchema = z.object({
  items: z.array(queueItemSchema),
  boardTitles: z.record(z.string(), z.string()),
});

export const legacySchema = z.array(queueItemSchema);
