// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { traceIdMiddleware } from './middleware/traceId.middleware';
import { requestLogger } from './utils/logger';
import { globalErrorHandler } from './middleware/errorHandler.middleware';
import { swaggerSpec } from './config/swagger';
import { sendSuccess } from './utils/response';
import { env } from './config/env';

import authRoutes from './modules/auth/auth.routes';
import meetingsRoutes from './modules/meetings/meetings.routes';
import analysisRoutes from './modules/analysis/analysis.routes';
import actionItemsRoutes from './modules/actionItems/actionItems.routes';

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // allow Swagger UI to load inline scripts
  }),
);
app.use(cors({ origin: '*', exposedHeaders: ['X-Trace-Id'] }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Observability ───────────────────────────────────────────────────────────
app.use(traceIdMiddleware);
app.use(requestLogger);

// ─── API Docs ────────────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/docs:
 *   get:
 *     tags: [Meta]
 *     summary: Swagger UI — interactive API documentation
 *     responses:
 *       200:
 *         description: Swagger UI HTML
 */
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Meeting Intelligence API',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health & Evaluation ─────────────────────────────────────────────────────
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Meta]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: UP }
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'UP' });
});

/**
 * @openapi
 * /api/evaluation:
 *   get:
 *     tags: [Meta]
 *     summary: Submission evaluation metadata
 *     responses:
 *       200:
 *         description: Candidate and project info
 */
app.get('/api/evaluation', (req, res) => {
  sendSuccess(res, {
    candidateName: env.CANDIDATE_NAME,
    email: env.CANDIDATE_EMAIL,
    repositoryUrl: env.REPOSITORY_URL,
    deployedUrl: env.DEPLOYED_URL,
    externalIntegration: 'Telegram Bot API',
    llmProvider: `${env.LLM_PROVIDER} (${env.LLM_MODEL ?? 'default'})`,
    features: [
      'JWT Authentication',
      'Meeting Management (CRUD + Pagination)',
      'AI Analysis with Grounded Citations',
      'Action Item Tracking (PENDING → IN_PROGRESS → COMPLETED)',
      'Overdue Detection',
      'Scheduled Reminder Job (node-cron, hourly)',
      'Telegram Bot Integration',
      'Structured Logging (pino)',
      'Request Trace IDs',
      'Unified API Response Format',
      'Input Validation (Zod)',
      'Swagger / OpenAPI Docs',
    ],
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/meetings', analysisRoutes);
app.use('/api/action-items', actionItemsRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    traceId: req.traceId,
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
