# Technical Decisions

This document explains the key technical decisions made for the Meeting Intelligence Service.

---

## 1. Database: SQLite (dev) + PostgreSQL (prod) via Prisma

**Why:**
- SQLite requires zero setup for local development — one file, no Docker
- Prisma's migration system makes swapping to PostgreSQL trivial (change `DATABASE_URL`)
- Prisma provides type-safe queries and auto-generated migrations, reducing boilerplate

**Alternatives Considered:**
- Raw `pg`/`mysql2` drivers — more control but much more boilerplate, no type safety
- MongoDB + Mongoose — flexible schema but overkill here; relational data (User→Meeting→ActionItem) maps naturally to SQL

**Trade-offs:**
- SQLite doesn't support native JSON column type, so JSON arrays are stored as strings and deserialized in service layer. In production with PostgreSQL, these would use native `Json` type.

---

## 2. Authentication: JWT (Stateless Bearer Tokens)

**Why:**
- Stateless — no session store needed, easy to scale horizontally
- Easy for evaluators to test with tools like Postman/curl
- Standard in REST APIs; well-understood by interviewers

**Alternatives Considered:**
- Session-based (express-session + Redis) — more secure (revocable) but requires Redis infrastructure
- OAuth2 — overkill for an assignment

**Trade-offs:**
- JWTs cannot be revoked before expiry without a token blocklist. Mitigated by short expiry (`7d` default, easily reduced).

---

## 3. LLM Provider: Groq (Llama 3.3 70B)

**Why:**
- Free tier with generous rate limits — perfect for demo/evaluation
- Extremely fast inference (often <2s for complex prompts)
- Supports `response_format: { type: "json_object" }` — forces JSON output, eliminates markdown wrapping

**Alternatives Considered:**
- OpenAI GPT-4o — best quality, but costs money
- Google Gemini — free, good quality, but JSON mode requires `responseMimeType` and is less reliable
- Claude (Anthropic) — excellent reasoning, but no free tier

**Trade-offs:**
- Groq has occasional rate limit errors (429) under heavy load; mitigated with proper error handling.
- Model output quality is slightly below GPT-4o for complex reasoning.

---

## 4. Hallucination Prevention: Strict Prompting + Zod Validation

**Why:**
- The prompt explicitly numbers transcript entries and requires `citations: [{timestamp, entryIndex}]` for every insight
- Zod validates the entire LLM output before it touches the database — if citations are missing, the request fails with a clear error
- Temperature set to 0.1 (near-deterministic) to reduce creative fabrication

**Alternatives Considered:**
- RAG (Retrieval-Augmented Generation) — more robust for large transcripts but significant infrastructure overhead
- Post-hoc hallucination detection — would require a second LLM call, doubling latency and cost

**Trade-offs:**
- Strict Zod schema may occasionally reject valid but slightly malformed LLM output. The error response is clear enough that clients can retry.

---

## 5. External Integration: Telegram Bot API

**Why:**
- Zero infrastructure cost — just a bot token and chat ID
- No webhook URL needed — we push to their API directly
- Easy to set up in under 5 minutes for evaluation
- HTML message formatting allows rich, readable reminders

**Alternatives Considered:**
- Slack — requires a workspace and app creation, more setup friction
- Email (Resend/SendGrid) — requires domain verification for production
- Discord Webhook — also simple, but Telegram is more universally accessible

**Trade-offs:**
- Requires the evaluator to set up a bot and have a Telegram account. Service degrades gracefully (logs warning, records failed ReminderLog) if not configured.

---

## 6. Scheduler: node-cron

**Why:**
- No external dependencies — runs in-process, zero infrastructure
- Sufficient for a demonstration at this scale
- Errors in the job are isolated (try/catch) and never crash the HTTP server

**Alternatives Considered:**
- Bull/BullMQ (Redis-backed) — production-grade, supports retries/backoff, but requires Redis
- Agenda (MongoDB-backed) — similar power, but MongoDB dependency
- AWS EventBridge / Render Cron Jobs — cloud-native, but adds deployment complexity for a demo

**Trade-offs:**
- In-process scheduler doesn't survive horizontal scaling (multiple instances would each run the cron). For production, migrate to a database-backed queue (Bull + Redis).

---

## 7. Validation: Zod

**Why:**
- TypeScript-first — schemas double as both runtime validators and static type definitions
- Used for three purposes: env validation, request body validation, and LLM output validation
- Excellent error messages with `.flatten()` for field-level feedback

**Alternatives Considered:**
- Joi — mature but not TypeScript-native
- class-validator — decorator-based, requires class instances
- Yup — similar to Zod but slower and less TypeScript-friendly

---

## 8. Project Structure: Module-Based

**Why:**
- Each feature (auth, meetings, analysis, actionItems) is a self-contained directory with schema/service/controller/routes
- Easy to locate code, easy to test in isolation, easy to extract as microservices if needed

**Alternatives Considered:**
- Layer-based (all controllers together, all services together) — harder to navigate as the project grows
- MVC with decorators (NestJS) — powerful but heavyweight for this scope
