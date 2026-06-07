// src/modules/analysis/analysis.controller.ts
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { analyzeMeeting } from './analysis.service';

/**
 * @openapi
 * tags:
 *   name: Analysis
 *   description: AI-powered meeting analysis
 *
 * /api/meetings/{id}/analyze:
 *   post:
 *     tags: [Analysis]
 *     summary: Analyze a meeting transcript with AI
 *     description: |
 *       Sends the meeting transcript to an LLM (Groq / Gemini) and extracts:
 *       - Summary with transcript citations
 *       - Action items with assignees and citations
 *       - Decisions made with citations
 *       - Follow-up suggestions with citations
 *
 *       All generated content is grounded in the transcript — hallucination is prevented
 *       by strict prompting and Zod schema validation of the LLM output.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Meeting ID to analyze
 *     responses:
 *       200:
 *         description: AI analysis result with citations
 *       404:
 *         description: Meeting not found
 *       502:
 *         description: LLM error or invalid AI output
 */
export async function analyzeMeetingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await analyzeMeeting(req.params.id as string, req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
