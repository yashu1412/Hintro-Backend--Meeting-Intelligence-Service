// src/modules/analysis/prompts.ts
import { TranscriptEntry } from '../meetings/meetings.schema';

/**
 * Builds a strict grounding prompt for the LLM.
 * The prompt explicitly forbids hallucination and requires
 * every insight to cite the exact transcript timestamp(s) it came from.
 */
export function buildAnalysisPrompt(
  title: string,
  participants: string[],
  transcript: TranscriptEntry[],
): string {
  const transcriptText = transcript
    .map((t, i) => `[${i + 1}] [${t.timestamp}] ${t.speaker}: ${t.text}`)
    .join('\n');

  return `You are a precise meeting analyst. Your task is to analyze the meeting transcript below and extract structured insights.

STRICT RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. ONLY use information explicitly stated in the transcript. Do NOT invent, infer, or assume anything.
2. Do NOT add attendees, action items, decisions, or outcomes that are not directly mentioned in the transcript.
3. Every generated insight MUST include a "citations" array referencing the exact transcript entry numbers (e.g. [1], [3]) where that information appears.
4. If you cannot find evidence for something in the transcript, omit it entirely — do not guess.
5. Return ONLY a valid JSON object matching the schema below. No markdown, no explanation, no preamble.

MEETING DETAILS:
Title: ${title}
Participants: ${participants.join(', ')}

TRANSCRIPT (indexed for citation):
${transcriptText}

REQUIRED JSON OUTPUT SCHEMA (respond with ONLY this JSON):
{
  "summary": [
    {
      "text": "string — a single factual sentence summarizing one topic discussed",
      "citations": [{"timestamp": "string", "entryIndex": number}]
    }
  ],
  "actionItems": [
    {
      "task": "string — specific actionable task",
      "assignee": "string — name of person assigned (exactly as in transcript)",
      "dueDate": "string | null — ISO date if mentioned, null if not",
      "citations": [{"timestamp": "string", "entryIndex": number}]
    }
  ],
  "decisions": [
    {
      "text": "string — a decision that was explicitly made",
      "citations": [{"timestamp": "string", "entryIndex": number}]
    }
  ],
  "followUps": [
    {
      "text": "string — a follow-up topic or question raised",
      "citations": [{"timestamp": "string", "entryIndex": number}]
    }
  ]
}

Remember: if a section has no grounded evidence, return an empty array [] for that section. Never fabricate content.`;
}
