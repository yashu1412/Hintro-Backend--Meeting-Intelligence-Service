// src/modules/analysis/analysis.service.ts
import axios from 'axios';
import { z } from 'zod';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler.middleware';
import { buildAnalysisPrompt } from './prompts';

// ─── Zod schema for LLM output validation ────────────────────────────────────
const citationSchema = z.object({
  timestamp: z.string(),
  entryIndex: z.number().optional(),
});

const insightSchema = z.object({
  text: z.string().min(1),
  citations: z.array(citationSchema).min(1, 'Every insight must have at least one citation'),
});

const actionItemInsightSchema = z.object({
  task: z.string().min(1),
  assignee: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  citations: z.array(citationSchema).min(1, 'Every action item must have at least one citation'),
});

const llmOutputSchema = z.object({
  summary: z.array(insightSchema),
  actionItems: z.array(actionItemInsightSchema),
  decisions: z.array(insightSchema),
  followUps: z.array(insightSchema),
});

type LlmOutput = z.infer<typeof llmOutputSchema>;

// ─── LLM Callers ─────────────────────────────────────────────────────────────
async function callOpenRouter(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      `${env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: env.LLM_MODEL,
        messages: [
          {
            role: 'system',
            // Explicit JSON instruction — no response_format param (not universally supported)
            content:
              'You are a precise meeting analyst. ' +
              'You MUST respond with ONLY a valid JSON object. ' +
              'Do NOT include markdown, code fences, or any explanation. ' +
              'Output raw JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/yashu1412/TaltRoom-AI',
          'X-Title': 'Meeting Intelligence Service',
        },
        timeout: 120000,
      },
    );
    const content: string = response.data.choices[0].message.content;
    // Strip accidental markdown fences if model adds them
    return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message
      ?? err?.response?.data?.message
      ?? err?.response?.statusText
      ?? err?.message
      ?? 'Unknown OpenRouter error';
    logger.error({ model: env.LLM_MODEL, detail }, 'OpenRouter API error');
    throw new AppError('AI_ERROR', `OpenRouter error: ${detail}`, 502);
  }
}

async function callGroq(prompt: string): Promise<string> {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a precise meeting analyst. Always respond with valid JSON only. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );
  return response.data.choices[0].message.content;
}

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    },
    { timeout: 30000 },
  );
  return response.data.candidates[0].content.parts[0].text;
}

async function callLLM(prompt: string): Promise<string> {
  if (env.LLM_PROVIDER === 'openrouter' && env.OPENROUTER_API_KEY) {
    return callOpenRouter(prompt);
  }
  if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return callGemini(prompt);
  }
  if (env.GROQ_API_KEY) {
    return callGroq(prompt);
  }
  throw new AppError('CONFIGURATION_ERROR', 'No LLM API key configured', 500);
}

// ─── Parse and validate LLM response ─────────────────────────────────────────
function parseLlmOutput(raw: string): LlmOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('AI_PARSE_ERROR', 'LLM returned invalid JSON', 502);
  }

  const result = llmOutputSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn({ zodErrors: result.error.flatten() }, 'LLM output failed Zod validation');
    throw new AppError(
      'AI_VALIDATION_ERROR',
      'LLM output did not match expected schema',
      502,
      result.error.flatten(),
    );
  }
  return result.data;
}

// ─── Main analysis function ───────────────────────────────────────────────────
export async function analyzeMeeting(meetingId: string, userId: string) {
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, userId } });
  if (!meeting) {
    throw new AppError('NOT_FOUND', 'Meeting not found', 404);
  }

  const participants: string[] = JSON.parse(meeting.participants);
  const transcript = JSON.parse(meeting.transcript);

  const prompt = buildAnalysisPrompt(meeting.title, participants, transcript);

  logger.info({ traceId: 'analysis', meetingId }, 'Calling LLM for meeting analysis');

  let rawResponse: string;
  try {
    rawResponse = await callLLM(prompt);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError('AI_ERROR', `LLM call failed: ${err.message}`, 502);
  }

  const output = parseLlmOutput(rawResponse);

  // Save analysis to DB
  const analysis = await prisma.analysis.create({
    data: {
      meetingId,
      summary: JSON.stringify(output.summary),
      actionItems: JSON.stringify(output.actionItems),
      decisions: JSON.stringify(output.decisions),
      followUps: JSON.stringify(output.followUps),
      rawPrompt: prompt,
      rawResponse,
    },
  });

  // Auto-create ActionItem rows from LLM-extracted action items
  const actionItemCreates = output.actionItems.map((ai) =>
    prisma.actionItem.create({
      data: {
        meetingId,
        userId,
        task: ai.task,
        assignee: ai.assignee,
        dueDate: ai.dueDate ? new Date(ai.dueDate) : null,
        citations: JSON.stringify(ai.citations),
        status: 'PENDING',
      },
    }),
  );
  const createdActionItems = await Promise.all(actionItemCreates);

  return {
    analysis: {
      ...analysis,
      summary: output.summary,
      actionItems: output.actionItems,
      decisions: output.decisions,
      followUps: output.followUps,
    },
    actionItemsCreated: createdActionItems.length,
  };
}
