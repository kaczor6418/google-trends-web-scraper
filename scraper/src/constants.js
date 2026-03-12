/**
 * Consistent identifiers for Google Trends widget types.
 */
export const QUERY_TYPES = {
  INTEREST_OVER_TIME: "INTEREST_OVER_TIME",
  TOP_QUERIES: "TOP_QUERIES",
  RISING_QUERIES: "RISING_QUERIES"
};

/**
 * Maps widget index to internal Query Type.
 */
export const WIDGET_TYPE_MAP = {
  0: QUERY_TYPES.INTEREST_OVER_TIME,
  1: QUERY_TYPES.TOP_QUERIES,
  2: QUERY_TYPES.RISING_QUERIES
};

export const TIMEFRAME_CONFIG = {
  LAST_HOUR: "now 1-H",
  LAST_4_HOURS: "now 4-H",
  LAST_24_HOURS: "now 1-d"
};