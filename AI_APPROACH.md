# AI Approach

This document explains the AI strategy, prompt design, and hallucination prevention techniques used in the Meeting Intelligence Service.

---

## 1. Provider Choice

**OpenRouter** is used as the primary LLM provider, utilizing the **NVIDIA Nemotron 3 Ultra (free)** model (`nvidia/nemotron-3-ultra-550b-a55b:free`) as the default.

- Temperature `0.1` minimizes creative invention while allowing high-quality natural language output.
- 120-second timeout allows processing of large meetings by massive frontier reasoning models.
- **Groq** (using Llama 3.3 70B) and **Google Gemini** (using Gemini 1.5 Flash) are supported as seamless fallback options.

---

## 2. Prompt Design

The prompt is built by `src/modules/analysis/prompts.ts`.

### Structure

```
[ROLE]: You are a precise meeting analyst.
[STRICT RULES]: 5 explicit anti-hallucination rules
[MEETING DETAILS]: title, participants
[TRANSCRIPT]: Numbered, indexed for citation
[OUTPUT SCHEMA]: Exact JSON structure with example
```

### Key Design Decisions

**Numbered transcript entries**: Each entry is prefixed `[1] [00:10] John: text`. This gives the model a concrete index to cite, making citations verifiable.

**Explicit forbidden behaviors**: The prompt lists what the model must NOT do:
1. Invent attendees
2. Invent action items
3. Invent decisions
4. Add information not in the transcript
5. Return non-JSON output

**Required `citations` field on every insight**: The JSON schema requires `"citations": [{"timestamp":"...", "entryIndex": N}]` on every summary item, action item, decision, and follow-up. Empty arrays on evidence-less sections are explicitly permitted and preferred over invention.

**Empty array escape hatch**: If a section has no grounded evidence, the model returns `[]` rather than fabricating content. This is explicitly stated in the prompt.

---

## 3. Output Validation Pipeline

After the LLM responds, the raw string passes through a strict validation pipeline:

```
LLM Response (string)
  → Strip Markdown Code Fences (if any)
  → JSON.parse()          [fails → AppError: AI_PARSE_ERROR]
  → Zod schema validation  [fails → AppError: AI_VALIDATION_ERROR]
  → Save to DB
  → Auto-create ActionItem rows
```

The Zod schema enforces:
- `citations.length >= 1` on every insight — zero-citation insights are rejected
- `task`, `assignee`, `text` are non-empty strings
- Structure integrity: no unexpected shapes pass through

This means the system **cannot save hallucinated content** — if the LLM invents an action item without citing it, Zod rejects the entire response.

---

## 4. Citation Format

Every AI-generated insight carries:
```json
{
  "text": "Team plans to launch next Friday.",
  "citations": [
    { "timestamp": "00:10", "entryIndex": 1 }
  ]
}
```

- `timestamp` maps directly to the transcript `timestamp` field (human-readable)
- `entryIndex` is the 1-based position in the numbered transcript (machine-verifiable)

This makes citations both human-readable and programmatically verifiable.

---

## 5. Limitations & Future Improvements

| Limitation | Mitigation |
|------------|-----------|
| LLM may still hallucinate despite prompting | Zod validation catches structural failures; citation requirement catches unsupported claims |
| Long transcripts may exceed context window | For production: chunk transcript by time segments, analyze each chunk, merge results |
| No retry on Zod validation failure | Could implement 1 retry with a "fix your JSON" prompt |
| No embedding-based retrieval | RAG with pgvector would improve citation accuracy for long meetings |

---

## 6. Example Analysis Flow

**Input transcript:**
```
[1] [00:10] John: We should launch next Friday.
[2] [00:20] Alice: I will prepare release notes.
```

**Prompt instructs:** Only use what is in the transcript. Cite every claim.

**LLM Output (validated):**
```json
{
  "summary": [
    {
      "text": "Team plans to launch next Friday.",
      "citations": [{"timestamp": "00:10", "entryIndex": 1}]
    }
  ],
  "actionItems": [
    {
      "task": "Prepare release notes",
      "assignee": "Alice",
      "dueDate": null,
      "citations": [{"timestamp": "00:20", "entryIndex": 2}]
    }
  ],
  "decisions": [],
  "followUps": []
}
```

Note: `decisions` and `followUps` are empty `[]` — no explicit decisions or follow-ups were stated in the transcript, so the model correctly returns empty arrays rather than inventing content.
