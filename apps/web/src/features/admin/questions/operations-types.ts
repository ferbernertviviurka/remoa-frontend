import type {z} from 'zod';
import type {questionAdminOutboxQuerySchema,questionAdminOutboxItemSchema} from '@remoa/contracts';
export type {QuestionHashPrepareInput,QuestionOutboxRecoverInput} from '@remoa/contracts';
export type QuestionAdminOutboxQuery=z.input<typeof questionAdminOutboxQuerySchema>;
export type QuestionAdminOutboxItem=z.output<typeof questionAdminOutboxItemSchema>;
