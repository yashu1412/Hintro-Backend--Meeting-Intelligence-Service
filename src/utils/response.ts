// src/utils/response.ts
import { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  traceId: string;
  success: true;
  data: T;
}

export interface ApiError {
  traceId: string;
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccess<T> = {
    traceId: (res.req as any).traceId ?? 'unknown',
    success: true,
    data,
  };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
): void {
  const body: ApiError = {
    traceId: (res.req as any).traceId ?? 'unknown',
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  res.status(statusCode).json(body);
}
