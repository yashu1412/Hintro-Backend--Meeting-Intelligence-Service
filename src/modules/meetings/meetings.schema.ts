// src/modules/meetings/meetings.schema.ts
import { z } from 'zod';

export const transcriptEntrySchema = z.object({
  timestamp: z.string().min(1, 'Timestamp is required (e.g. "00:10")'),
  speaker: z.string().min(1, 'Speaker name is required'),
  text: z.string().min(1, 'Transcript text is required'),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  participants: z
    .array(z.string().email('Each participant must be a valid email'))
    .min(1, 'At least one participant is required'),
  meetingDate: z.string().datetime('meetingDate must be a valid ISO 8601 datetime'),
  transcript: z
    .array(transcriptEntrySchema)
    .min(1, 'Transcript must have at least one entry'),
});

export const listMeetingsQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  search: z.string().optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type TranscriptEntry = z.infer<typeof transcriptEntrySchema>;
