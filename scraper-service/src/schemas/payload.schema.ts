import { z } from 'zod';

const TimeframeSchema = z.union([
  z.string(),
  z.object({ start: z.string(), end: z.string() })
]);

export const TrendsPayloadSchema = z.discriminatedUnion("queryType", [
  z.object({
    queryType: z.literal("INTEREST_OVER_TIME"),
    phrase: z.string(),
    timeframe: TimeframeSchema,
    geo: z.string(),
    extractedAt: z.iso.datetime(),
    data: z.array(z.object({ time: z.string(), value: z.string() }))
  }),
  z.object({
    queryType: z.literal("TOP_QUERIES"),
    phrase: z.string(),
    timeframe: TimeframeSchema,
    geo: z.string(),
    extractedAt: z.iso.datetime(),
    data: z.array(z.object({ query: z.string(), searchInterest: z.string(), increasePercent: z.string().optional() }))
  })
]);