// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = (result.error as ZodError).flatten().fieldErrors;
      sendError(res, 'VALIDATION_ERROR', 'Input validation failed', 422, details);
      return;
    }
    req[part] = result.data;
    next();
  };
}
