import { Router } from 'express';
import * as TrendController from '../controllers/trends.controller';

const router = Router();

router.post('/ingest', TrendController.ingestTrends);
router.get('/top', TrendController.getTopTrending);
router.get('/:phraseId', TrendController.getTrendHistory);

export default router;