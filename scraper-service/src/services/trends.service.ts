import { normalizePhrase } from '../utils/normalizePhrase';
import { prisma } from '../lib/prisma';
import { InterestOverTimePayload, TopQueriesPayload, RisingQueriesPayload, QueryEntry } from '../types/trends.types';
import { calculateSlope } from '../utils/calculateSlope';

/**
 * Shared logic: Ensures the base phrase and the specific day's trend record exist.
 */
async function ensureTrendRecord(tx: any, payload: { phrase: string, geo: string, timeframe: string, extractedAt: string }) {
  const normalized = normalizePhrase(payload.phrase);
  const snapshotDate = new Date(payload.extractedAt);
  snapshotDate.setHours(0, 0, 0, 0);

  // 1. Get/Create Phrase
  let lp = await tx.longtailPhrase.findFirst({ where: { phraseNorm: normalized } });
  if (!lp) {
    const generalDict = await tx.dictionaryWord.upsert({
      where: { type_word: { type: 'popularnonaukowy', word: 'General' } },
      update: {},
      create: { type: 'popularnonaukowy', word: 'General' }
    });
    lp = await tx.longtailPhrase.create({
      data: { phrase: payload.phrase, phraseNorm: normalized, dictionaryWordId: generalDict.id, source: 'trends' }
    });
  }

  // 2. Upsert Trend Snapshot
  const trend = await tx.phraseTrend.upsert({
    where: {
      longtail_phrase_id_snapshot_date_geo_timeframe_param: {
        longtailPhraseId: lp.id,
        snapshotDate,
        geo: payload.geo,
        timeframeParam: payload.timeframe
      }
    },
    update: { extractedAt: new Date(payload.extractedAt) },
    create: {
      longtailPhraseId: lp.id,
      snapshotDate,
      geo: payload.geo,
      timeframeLabel: payload.timeframe,
      timeframeParam: payload.timeframe,
      extractedAt: new Date(payload.extractedAt)
    }
  });

  return { lp, trend, snapshotDate };
}

/**
 * Process INTEREST_OVER_TIME
 */
export const ingestInterest = async (payload: InterestOverTimePayload) => {
  return await prisma.$transaction(async (tx) => {
    const { lp, trend, snapshotDate } = await ensureTrendRecord(tx, payload);
    
    const values = payload.data.map(d => parseInt(d.value));
    const slope = calculateSlope(values);
    // FIX: Type 'a' and 'b' to resolve implicit 'any' error (Image_600f73.png)
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;

    const updatedTrend = await tx.phraseTrend.update({
      where: { id: trend.id },
      data: { 
        slope, 
        mean, 
        // FIX: Cast to any to satisfy Prisma JSON field (Image_5f3610.png)
        rawSeries: payload.data as any 
      }
    });

    // Use custom threshold if set, otherwise default to 2.0
    const threshold = lp.alertThresholdPct || 2.0;
    if (slope >= threshold) {
      await tx.trendAlert.upsert({
        where: { longtail_phrase_id_alert_day: { longtailPhraseId: lp.id, alertDay: snapshotDate } },
        update: { changePct: slope * 100 },
        create: { 
          longtailPhraseId: lp.id, 
          phraseTrendId: trend.id, 
          changePct: slope * 100, 
          status: 'open', 
          alertDay: snapshotDate,
          threshold: threshold 
        }
      });
    }
    return updatedTrend;
  });
};

/**
 * Process TOP or RISING queries
 */
export const ingestRelatedQueries = async (payload: TopQueriesPayload | RisingQueriesPayload) => {
  const groupType = payload.queryType === 'TOP_QUERIES' ? 'top' : 'rising';
  
  return await prisma.$transaction(async (tx) => {
    const { lp, trend } = await ensureTrendRecord(tx, payload);

    for (const [index, item] of (payload.data as QueryEntry[]).entries()) {
      const isBreakout = item.increasePercent === 'Breakout';
      const increaseVal = isBreakout ? 9999 : parseFloat(item.increasePercent?.replace(/[+%]/g, '') || '0');

      await tx.trendRelatedQuery.upsert({
        where: { phrase_trend_id_group_type_query: { phraseTrendId: trend.id, groupType, query: item.query } },
        update: { searchInterest: parseInt(item.searchInterest || '0'), increasePct: increaseVal, isBreakout },
        create: {
          phraseTrendId: trend.id,
          groupType,
          query: item.query,
          // FIX: Ensure rank is provided as it is required (Image_600fad.jpg)
          rank: index + 1,
          searchInterest: parseInt(item.searchInterest || '0'),
          increasePct: increaseVal,
          isBreakout
        }
      });

      if (isBreakout || increaseVal > 500) {
        await tx.longtailPhrase.upsert({
          where: { dictionary_word_id_phrase_norm: { dictionaryWordId: lp.dictionaryWordId, phraseNorm: normalizePhrase(item.query) } },
          update: {},
          create: { phrase: item.query, phraseNorm: normalizePhrase(item.query), dictionaryWordId: lp.dictionaryWordId, source: 'trends' }
        });
      }
    }
    return { status: 'success', group: groupType, count: payload.data.length };
  });
};

export const getTrending = async (limit = 10) => {
  return await prisma.phraseTrend.findMany({
    orderBy: { slope: 'desc' },
    take: limit,
    include: { longtailPhrase: true }
  });
};

export const getActiveAlerts = async () => {
  return await prisma.trendAlert.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'desc' },
    include: { longtailPhrase: true }
  });
};

export const updateAlertStatus = async (id: bigint, status: 'seen' | 'dismissed') => {
  return await prisma.trendAlert.update({
    where: { id },
    data: { status, seenAt: status === 'seen' ? new Date() : null }
  });
};

export const getPhraseDetail = async (id: bigint) => {
  return await prisma.longtailPhrase.findUnique({
    where: { id },
    include: {
      phraseTrends: {
        orderBy: { snapshotDate: 'desc' },
        include: { relatedQueries: true }
      },
      articles: true
    }
  });
};