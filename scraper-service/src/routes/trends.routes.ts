import { Router } from 'express';
import * as TrendController from '../controllers/trends.controller';

const router = Router();

// --- WRITE / INGESTION ROUTES ---
router.post("/ingest/interest", TrendController.handleInterestIngestion);
router.post("/ingest/top", TrendController.handleTopQueriesIngestion);
router.post("/ingest/rising", TrendController.handleRisingQueriesIngestion);

// --- READ / DASHBOARD ROUTES ---
router.get("/trending", TrendController.getTrendingNow);
router.get("/alerts", TrendController.getAlerts);
router.get("/phrases/:id/history", TrendController.getPhraseHistory);

// --- CONFIGURATION & MANAGEMENT ROUTES ---
router.patch("/phrases/:id/threshold", TrendController.updateThreshold);
router.patch("/alerts/:id/status", TrendController.patchAlertStatus);

export default router;