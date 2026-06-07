// tests/meetings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database', () => ({
  default: {
    meeting: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-at-least-32-characters-long-for-testing',
    JWT_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'file:./test.db',
    LLM_PROVIDER: 'groq',
    CANDIDATE_NAME: 'Test',
    CANDIDATE_EMAIL: 'test@test.com',
    REPOSITORY_URL: 'https://github.com/test',
    DEPLOYED_URL: 'http://localhost:3000',
  },
}));

import prisma from '../src/config/database';
import { createMeeting, listMeetings, getMeetingById } from '../src/modules/meetings/meetings.service';

const mockMeeting = {
  id: 'meeting-1',
  title: 'Sprint Planning',
  participants: '["alice@example.com", "bob@example.com"]',
  meetingDate: new Date('2026-05-20T10:00:00Z'),
  transcript: '[{"timestamp":"00:10","speaker":"John","text":"Launch next Friday."}]',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  analyses: [],
  actionItems: [],
};

describe('Meetings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMeeting', () => {
    it('should create a meeting and deserialize fields', async () => {
      (prisma.meeting.create as any).mockResolvedValue(mockMeeting);

      const result = await createMeeting(
        {
          title: 'Sprint Planning',
          participants: ['alice@example.com', 'bob@example.com'],
          meetingDate: '2026-05-20T10:00:00Z',
          transcript: [{ timestamp: '00:10', speaker: 'John', text: 'Launch next Friday.' }],
        },
        'user-1',
      );

      expect(prisma.meeting.create).toHaveBeenCalled();
      expect(result.title).toBe('Sprint Planning');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(result.participants[0]).toBe('alice@example.com');
      expect(result.transcript[0].speaker).toBe('John');
    });
  });

  describe('listMeetings', () => {
    it('should return paginated list of meetings', async () => {
      (prisma.meeting.findMany as any).mockResolvedValue([mockMeeting]);
      (prisma.meeting.count as any).mockResolvedValue(1);

      const result = await listMeetings('user-1', 1, 10);

      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply search filter if provided', async () => {
      (prisma.meeting.findMany as any).mockResolvedValue([mockMeeting]);
      (prisma.meeting.count as any).mockResolvedValue(1);

      await listMeetings('user-1', 1, 10, 'Sprint');

      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            title: { contains: 'Sprint' },
          },
        }),
      );
    });
  });

  describe('getMeetingById', () => {
    it('should return meeting if found', async () => {
      (prisma.meeting.findFirst as any).mockResolvedValue(mockMeeting);

      const result = await getMeetingById('meeting-1', 'user-1');

      expect(prisma.meeting.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meeting-1', userId: 'user-1' },
        }),
      );
      expect(result.id).toBe('meeting-1');
    });

    it('should throw NOT_FOUND error if meeting is not found', async () => {
      (prisma.meeting.findFirst as any).mockResolvedValue(null);

      await expect(
        getMeetingById('meeting-invalid', 'user-1'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    });
  });
});
