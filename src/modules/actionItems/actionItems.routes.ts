// src/modules/actionItems/actionItems.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createActionItemSchema,
  updateStatusSchema,
  listActionItemsQuerySchema,
} from './actionItems.schema';
import {
  createActionItemHandler,
  listActionItemsHandler,
  overdueActionItemsHandler,
  updateStatusHandler,
} from './actionItems.controller';

const router = Router();

router.use(authenticate);

// IMPORTANT: /overdue must be before /:id to avoid route shadowing
router.get('/overdue', overdueActionItemsHandler);
router.get('/', validate(listActionItemsQuerySchema, 'query'), listActionItemsHandler);
router.post('/', validate(createActionItemSchema), createActionItemHandler);
router.patch('/:id/status', validate(updateStatusSchema), updateStatusHandler);

export default router;
