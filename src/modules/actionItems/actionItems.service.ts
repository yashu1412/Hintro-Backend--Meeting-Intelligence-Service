// src/modules/actionItems/actionItems.service.ts
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { CreateActionItemInput, UpdateStatusInput } from './actionItems.schema';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['COMPLETED', 'PENDING'],
  COMPLETED: [],
};

export async function createActionItem(input: CreateActionItemInput, userId: string) {
  if (input.meetingId) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: input.meetingId, userId },
    });
    if (!meeting) {
      throw new AppError('NOT_FOUND', 'Meeting not found', 404);
    }
  }

  const item = await prisma.actionItem.create({
    data: {
      meetingId: input.meetingId ?? null,
      userId,
      task: input.task,
      assignee: input.assignee,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      citations: JSON.stringify(input.citations ?? []),
      status: 'PENDING',
    },
  });
  return deserialize(item);
}

export async function listActionItems(
  userId: string,
  page: number,
  limit: number,
  filters: { status?: string; assignee?: string; meetingId?: string },
) {
  const skip = (page - 1) * limit;
  const where: any = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.assignee) where.assignee = { contains: filters.assignee };
  if (filters.meetingId) where.meetingId = filters.meetingId;

  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.actionItem.count({ where }),
  ]);

  return {
    data: items.map(deserialize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getOverdueActionItems(userId: string) {
  const now = new Date();
  const items = await prisma.actionItem.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      dueDate: { lt: now, not: null },
    },
    orderBy: { dueDate: 'asc' },
    include: { meeting: { select: { title: true } } },
  });
  return items.map(deserialize);
}

export async function updateActionItemStatus(
  id: string,
  userId: string,
  input: UpdateStatusInput,
) {
  const item = await prisma.actionItem.findFirst({ where: { id, userId } });
  if (!item) {
    throw new AppError('NOT_FOUND', 'Action item not found', 404);
  }

  const allowed = VALID_TRANSITIONS[item.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot transition from ${item.status} to ${input.status}. Allowed: [${allowed.join(', ')}]`,
      400,
    );
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: { status: input.status as any },
  });
  return deserialize(updated);
}

function deserialize(item: any) {
  return {
    ...item,
    citations:
      typeof item.citations === 'string' ? JSON.parse(item.citations) : item.citations,
  };
}
