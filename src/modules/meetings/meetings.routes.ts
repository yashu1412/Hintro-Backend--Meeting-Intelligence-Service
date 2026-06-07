// src/modules/meetings/meetings.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createMeetingSchema, listMeetingsQuerySchema } from './meetings.schema';
import {
  createMeetingHandler,
  listMeetingsHandler,
  getMeetingHandler,
} from './meetings.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createMeetingSchema), createMeetingHandler);
router.get('/', validate(listMeetingsQuerySchema, 'query'), listMeetingsHandler);
router.get('/:id', getMeetingHandler);

export default router;
