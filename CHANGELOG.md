# Changelog

All notable changes to the Meeting Intelligence Service will be documented in this file.

---

## [1.0.0] - 2026-06-07

### Added
- **Authentication**: Stateful user registration and JWT bearer token login.
- **Meeting Management**: REST endpoints for creating, retrieving, and listing meetings with pagination and search.
- **AI Analysis**: Meeting intelligence extraction (/api/meetings/:id/analyze) returning meeting summary, decisions, action items, and follow-up suggestions.
- **Transcript Citations**: Mandatory source citation validation for all AI insights, mapped to transcripts.
- **Action Item Tracking**: CRUD action items with status validation workflows (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`).
- **Overdue Detection**: API and automatic background query mapping to check overdue tasks.
- **Scheduled Reminders**: `node-cron` background scheduler running hourly to discover overdue tasks.
- **External Integration**: Telegram Bot API integration to push notifications/alerts for overdue action items.
- **Structured Logging**: Integrated `pino` for clean JSON log layouts.
- **Request Traceability**: Unified trace IDs attached to requests, headers, error responses, and logging context.
- **Input Validation**: Strongly typed client payloads via `zod`.
- **API Documentation**: Public interactive docs with `swagger-ui-express` under `/api/docs`.
- **OpenRouter & LLM Selection**: Supported OpenRouter provider config to run free models (e.g., `nvidia/nemotron-3-ultra-550b-a55b:free` / `nvidia/nemotron-ultra-253b-v1`).
- **Unit Testing**: 14 tests verifying authentication, meeting management, and action items services.
