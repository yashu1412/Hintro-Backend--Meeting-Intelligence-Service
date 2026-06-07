// src/modules/analysis/analysis.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { analyzeMeetingHandler } from './analysis.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.post('/:id/analyze', analyzeMeetingHandler);

export default router;
