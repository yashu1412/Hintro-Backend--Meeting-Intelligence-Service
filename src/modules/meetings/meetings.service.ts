// src/modules/meetings/meetings.service.ts
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { CreateMeetingInput } from './meetings.schema';

export async function createMeeting(input: CreateMeetingInput, userId: string) {
  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      participants: JSON.stringify(input.participants),
      meetingDate: new Date(input.meetingDate),
      transcript: JSON.stringify(input.transcript),
      userId,
    },
  });
  return deserializeMeeting(meeting);
}

export async function listMeetings(
  userId: string,
  page: number,
  limit: number,
  search?: string,
) {
  const skip = (page - 1) * limit;
  const where: any = { userId };
  if (search) {
    where.title = { contains: search };
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      skip,
      take: limit,
      orderBy: { meetingDate: 'desc' },
      include: { analyses: { select: { id: true, createdAt: true } } },
    }),
    prisma.meeting.count({ where }),
  ]);

  return {
    data: meetings.map(deserializeMeeting),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getMeetingById(id: string, userId: string) {
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId },
    include: {
      analyses: true,
      actionItems: true,
    },
  });
  if (!meeting) {
    throw new AppError('NOT_FOUND', 'Meeting not found', 404);
  }
  return deserializeMeeting(meeting);
}

function deserializeMeeting(meeting: any) {
  return {
    ...meeting,
    participants: typeof meeting.participants === 'string'
      ? JSON.parse(meeting.participants)
      : meeting.participants,
    transcript: typeof meeting.transcript === 'string'
      ? JSON.parse(meeting.transcript)
      : meeting.transcript,
    analyses: meeting.analyses
      ? meeting.analyses.map((a: any) => ({
          ...a,
          summary: typeof a.summary === 'string' ? JSON.parse(a.summary) : a.summary,
          actionItems: typeof a.actionItems === 'string' ? JSON.parse(a.actionItems) : a.actionItems,
          decisions: typeof a.decisions === 'string' ? JSON.parse(a.decisions) : a.decisions,
          followUps: typeof a.followUps === 'string' ? JSON.parse(a.followUps) : a.followUps,
        }))
      : undefined,
    actionItems: meeting.actionItems
      ? meeting.actionItems.map((ai: any) => ({
          ...ai,
          citations: typeof ai.citations === 'string' ? JSON.parse(ai.citations) : ai.citations,
        }))
      : undefined,
  };
}
