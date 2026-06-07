// tests/actionItems.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database', () => ({
  default: {
    actionItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    meeting: {
      findFirst: vi.fn(),
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
import {
  createActionItem,
  updateActionItemStatus,
  getOverdueActionItems,
} from '../src/modules/actionItems/actionItems.service';

const mockItem = {
  id: 'item-1',
  meetingId: null,
  userId: 'user-1',
  task: 'Prepare release notes',
  assignee: 'Alice',
  dueDate: new Date('2026-01-01'),
  status: 'PENDING',
  citations: '[]',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ActionItems Service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createActionItem', () => {
    it('creates an action item and deserializes citations', async () => {
      (prisma.actionItem.create as any).mockResolvedValue(mockItem);
      const result = await createActionItem(
        { task: 'Prepare release notes', assignee: 'Alice', citations: [] },
        'user-1',
      );
      expect(result.task).toBe('Prepare release notes');
      expect(Array.isArray(result.citations)).toBe(true);
    });
  });

  describe('updateActionItemStatus', () => {
    it('allows PENDING → IN_PROGRESS transition', async () => {
      (prisma.actionItem.findFirst as any).mockResolvedValue(mockItem);
      (prisma.actionItem.update as any).mockResolvedValue({
        ...mockItem,
        status: 'IN_PROGRESS',
      });

      const result = await updateActionItemStatus('item-1', 'user-1', {
        status: 'IN_PROGRESS',
      });
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('rejects COMPLETED → IN_PROGRESS transition', async () => {
      (prisma.actionItem.findFirst as any).mockResolvedValue({
        ...mockItem,
        status: 'COMPLETED',
      });

      await expect(
        updateActionItemStatus('item-1', 'user-1', { status: 'IN_PROGRESS' }),
      ).rejects.toMatchObject({ code: 'INVALID_TRANSITION', statusCode: 400 });
    });

    it('throws NOT_FOUND when item does not belong to user', async () => {
      (prisma.actionItem.findFirst as any).mockResolvedValue(null);

      await expect(
        updateActionItemStatus('item-1', 'user-2', { status: 'IN_PROGRESS' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getOverdueActionItems', () => {
    it('returns items where dueDate < now and status != COMPLETED', async () => {
      (prisma.actionItem.findMany as any).mockResolvedValue([mockItem]);
      const results = await getOverdueActionItems('user-1');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-1');
    });
  });
});
