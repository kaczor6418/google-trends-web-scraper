export interface InterestOverTimePoint {
  time: string;
  value: string;
}

export interface QueryEntry {
  query: string;
  searchInterest: string;
  increasePercent: string;
}

type TrendsQueryType = 'INTEREST_OVER_TIME' | 'TOP_QUERIES' | 'RISING_QUERIES';

export interface ScraperPayload<T extends TrendsQueryType = TrendsQueryType> {
  queryType: TrendsQueryType;
  phrase: string;
  geo: string;
  timeframe: string;
  extractedAt: string;
  data: T extends 'INTEREST_OVER_TIME' ? InterestOverTimePoint[] : QueryEntry[];
}

export type InterestOverTimePayload = ScraperPayload<'INTEREST_OVER_TIME'>;
export type RisingQueriesPayload = ScraperPayload<'RISING_QUERIES'>;
export type TopQueriesPayload = ScraperPayload<'TOP_QUERIES'>;