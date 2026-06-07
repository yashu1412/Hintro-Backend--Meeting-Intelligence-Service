# Meeting Intelligence Service

A production-ready backend service that stores meeting transcripts, generates AI-powered insights with grounded citations, and tracks action items with automated reminders.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| LLM | Groq (Llama 3.3 70B) / Gemini |
| Auth | JWT (Bearer) |
| Validation | Zod |
| Logging | pino |
| Scheduler | node-cron |
| Notifications | Telegram Bot API |
| Docs | Swagger / OpenAPI 3.0 |
| Testing | Vitest |

---

## Setup & Local Run

### 1. Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### 2. Clone & Install
```bash
git clone https://github.com/your/repo
cd hintroAI
npm install
```

### 3. Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `file:./dev.db` for SQLite |
| `JWT_SECRET` | Random string, min 32 chars |
| `GROQ_API_KEY` | From https://console.groq.com/keys |
| `TELEGRAM_BOT_TOKEN` | From @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

### 4. Database Setup
```bash
npm run db:migrate    # Creates SQLite file and runs migrations
npm run db:generate   # Generates Prisma client
```

### 5. Run Locally
```bash
npm run dev           # Hot-reload development server
```
Server starts at: http://localhost:3000

---

## API Documentation

Interactive Swagger UI: http://localhost:3000/api/docs

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `3000` | HTTP port |
| `DATABASE_URL` | **Yes** | — | Prisma DB connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry |
| `LLM_PROVIDER` | No | `groq` | `groq` or `gemini` |
| `GROQ_API_KEY` | Yes* | — | Groq API key (*if using Groq) |
| `GEMINI_API_KEY` | Yes* | — | Gemini API key (*if using Gemini) |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token for reminders |
| `TELEGRAM_CHAT_ID` | No | — | Telegram chat ID to send messages to |
| `CANDIDATE_NAME` | No | — | Your name (shown in /api/evaluation) |
| `CANDIDATE_EMAIL` | No | — | Your email |
| `REPOSITORY_URL` | No | — | GitHub repo URL |
| `DEPLOYED_URL` | No | — | Public deployment URL |

---

## API Usage Examples

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"SecurePass1"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"SecurePass1"}'
```

### Create Meeting
```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sprint Planning",
    "participants": ["alice@example.com","bob@example.com"],
    "meetingDate": "2026-05-20T10:00:00Z",
    "transcript": [
      {"timestamp":"00:10","speaker":"John","text":"We should launch next Friday."},
      {"timestamp":"00:20","speaker":"Alice","text":"I will prepare release notes."}
    ]
  }'
```

### Analyze Meeting
```bash
curl -X POST http://localhost:3000/api/meetings/<meetingId>/analyze \
  -H "Authorization: Bearer <token>"
```

### Check Overdue Items
```bash
curl http://localhost:3000/api/action-items/overdue \
  -H "Authorization: Bearer <token>"
```

---

## Deployment (Render)

1. Push to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm install && npm run db:migrate:deploy && npm run build`
4. Set start command: `npm start`
5. Add all environment variables (use PostgreSQL connection string)

---

## Running Tests
```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```
