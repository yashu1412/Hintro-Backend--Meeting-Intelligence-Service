// src/modules/actionItems/actionItems.controller.ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  createActionItem,
  listActionItems,
  getOverdueActionItems,
  updateActionItemStatus,
} from './actionItems.service';
import { CreateActionItemInput, UpdateStatusInput } from './actionItems.schema';

/**
 * @openapi
 * tags:
 *   name: ActionItems
 *   description: Action item tracking and management
 *
 * /api/action-items:
 *   post:
 *     tags: [ActionItems]
 *     summary: Create a new action item
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [task, assignee]
 *             properties:
 *               task: { type: string, example: "Prepare release notes" }
 *               assignee: { type: string, example: "Alice" }
 *               meetingId: { type: string, example: "clxyz..." }
 *               dueDate: { type: string, format: date-time, example: "2026-05-25T00:00:00Z" }
 *               citations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp: { type: string, example: "00:20" }
 *     responses:
 *       201: { description: Action item created }
 *       422: { description: Validation error }
 */
export async function createActionItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await createActionItem(req.body as CreateActionItemInput, req.user!.userId);
    sendSuccess(res, item, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/action-items:
 *   get:
 *     tags: [ActionItems]
 *     summary: List action items with filters
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
 *         name: status
 *         schema: { type: string, enum: [PENDING, IN_PROGRESS, COMPLETED] }
 *       - in: query
 *         name: assignee
 *         schema: { type: string }
 *       - in: query
 *         name: meetingId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated and filtered list of action items }
 */
export async function listActionItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page = 1, limit = 10, status, assignee, meetingId } = req.query as any;
    const result = await listActionItems(req.user!.userId, Number(page), Number(limit), {
      status,
      assignee,
      meetingId,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/action-items/overdue:
 *   get:
 *     tags: [ActionItems]
 *     summary: Get all overdue action items
 *     description: Returns items where status != COMPLETED AND dueDate < current time
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of overdue action items }
 */
export async function overdueActionItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await getOverdueActionItems(req.user!.userId);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/action-items/{id}/status:
 *   patch:
 *     tags: [ActionItems]
 *     summary: Update action item status
 *     description: |
 *       Valid transitions:
 *       - PENDING → IN_PROGRESS | COMPLETED
 *       - IN_PROGRESS → COMPLETED | PENDING
 *       - COMPLETED → (no further transitions)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid status transition }
 *       404: { description: Action item not found }
 */
export async function updateStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await updateActionItemStatus(
      req.params.id as string,
      req.user!.userId,
      req.body as UpdateStatusInput,
    );
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
}
