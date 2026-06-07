// src/modules/actionItems/actionItems.schema.ts
import { z } from 'zod';

export const createActionItemSchema = z.object({
  meetingId: z.string().optional(),
  task: z.string().min(1, 'Task description is required'),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().datetime('dueDate must be a valid ISO 8601 datetime').optional().nullable(),
  citations: z
    .array(z.object({ timestamp: z.string() }))
    .optional()
    .default([]),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
    errorMap: () => ({ message: 'status must be PENDING, IN_PROGRESS, or COMPLETED' }),
  }),
});

export const listActionItemsQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignee: z.string().optional(),
  meetingId: z.string().optional(),
});

export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
