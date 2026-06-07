// src/modules/meetings/meetings.controller.ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { createMeeting, listMeetings, getMeetingById } from './meetings.service';
import { CreateMeetingInput } from './meetings.schema';

/**
 * @openapi
 * tags:
 *   name: Meetings
 *   description: Meeting management endpoints
 *
 * /api/meetings:
 *   post:
 *     tags: [Meetings]
 *     summary: Create a new meeting with transcript
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, participants, meetingDate, transcript]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Sprint Planning
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["alice@example.com", "bob@example.com"]
 *               meetingDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-20T10:00:00Z"
 *               transcript:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp: { type: string, example: "00:10" }
 *                     speaker: { type: string, example: "John" }
 *                     text: { type: string, example: "We should launch next Friday." }
 *     responses:
 *       201:
 *         description: Meeting created
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */
export async function createMeetingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const meeting = await createMeeting(req.body as CreateMeetingInput, req.user!.userId);
    sendSuccess(res, meeting, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/meetings:
 *   get:
 *     tags: [Meetings]
 *     summary: List all meetings (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of meetings
 */
export async function listMeetingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page = 1, limit = 10, search } = req.query as any;
    const result = await listMeetings(req.user!.userId, Number(page), Number(limit), search);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/meetings/{id}:
 *   get:
 *     tags: [Meetings]
 *     summary: Get a single meeting by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Meeting details with transcript and analyses
 *       404:
 *         description: Meeting not found
 */
export async function getMeetingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const meeting = await getMeetingById(req.params.id as string, req.user!.userId);
    sendSuccess(res, meeting);
  } catch (err) {
    next(err);
  }
}
