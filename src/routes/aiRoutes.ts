import { Router } from 'express';
import { generateDraftReport } from '../controllers/aiController';
import { generateFirstPageSummary } from '../controllers/firstpageAIController';

const router = Router();

// POST /api/ai/generate
router.post('/generate', generateDraftReport);
router.post('/first-page', generateFirstPageSummary);

export default router;
