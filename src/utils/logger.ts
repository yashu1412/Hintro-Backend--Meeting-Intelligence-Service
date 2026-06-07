// src/utils/logger.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: { service: 'meeting-intelligence' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}
