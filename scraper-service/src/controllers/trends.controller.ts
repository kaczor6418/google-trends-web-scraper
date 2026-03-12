import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as TrendService from '../services/trends.service';
import { InterestOverTimePayload, TopQueriesPayload, RisingQueriesPayload } from '../types/trends.types';

export const handleInterestIngestion = async (req: Request<{}, {}, InterestOverTimePayload>, res: Response) => {
  try {
    const result = await TrendService.ingestInterest(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const handleTopQueriesIngestion = async (req: Request<{}, {}, TopQueriesPayload>, res: Response) => {
  try {
    const result = await TrendService.ingestRelatedQueries(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const handleRisingQueriesIngestion = async (req: Request<{}, {}, RisingQueriesPayload>, res: Response) => {
  try {
    const result = await TrendService.ingestRelatedQueries(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateThreshold = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { alert_threshold_pct } = req.body;
    const threshold = alert_threshold_pct === null ? null : Number(alert_threshold_pct);

    const updated = await prisma.longtailPhrase.update({
      where: { id: BigInt(id) },
      data: { alertThresholdPct: threshold },
      select: { id: true, phrase: true, alertThresholdPct: true }
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getTrendingNow = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const data = await TrendService.getTrending(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const data = await TrendService.getActiveAlerts();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const patchAlertStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['seen', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    const data = await TrendService.updateAlertStatus(BigInt(id), status);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPhraseHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await TrendService.getPhraseDetail(BigInt(id));
    if (!data) return res.status(404).json({ error: "Phrase not found" });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};