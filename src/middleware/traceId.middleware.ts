// src/middleware/traceId.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-trace-id'] as string | undefined;
  req.traceId = incoming && incoming.trim() ? incoming.trim() : uuidv4();
  res.setHeader('X-Trace-Id', req.traceId);
  next();
}
