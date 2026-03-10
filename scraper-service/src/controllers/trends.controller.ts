import { Request, Response } from 'express';
import { TrendsPayloadSchema } from '../schemas/payload.schema';

export const ingestTrends = (req: Request, res: Response) => {
  const result = TrendsPayloadSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json(result.error);
  // Service call: await TrendService.ingest(result.data);
  res.status(202).json({ message: "Ingestion service pending" });
};

export const getTopTrending = (req: Request, res: Response) => {
  const { minScore } = req.query;
  res.json({ message: "Fetching top trends", minScore });
};

export const getTrendHistory = (req: Request, res: Response) => {
  const { phraseId } = req.params;
  res.json({ message: `Fetching history for ${phraseId}` });
};