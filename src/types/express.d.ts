// src/types/express.d.ts
import { JwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      traceId: string;
      user?: JwtPayload;
    }
  }
}
