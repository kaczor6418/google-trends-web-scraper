import { QUERY_TYPES } from '../constants.js';

/**
 * Normalizes the CSV data to ensure consistent, camelCase keys.
 * Handles both timeseries (Interest over time) and list-based (Queries) widgets.
 * * @param {Array<Object>} rawData - The array of objects parsed from CSV.
 * @param {string} type - The QUERY_TYPES constant.
 * @returns {Array<Object>} Normalized data array.
 */
export function normalizeScrapedData(rawData, type) {
  return rawData.map(row => {
    const normalizedRow = {};

    if (type === QUERY_TYPES.INTEREST_OVER_TIME) {
      const keys = Object.keys(row);
      const timeKey = keys.find(k => k.toLowerCase() === 'time');
      const valueKey = keys.find(k => k.toLowerCase() !== 'time');
      normalizedRow.time = row[timeKey];
      normalizedRow.value = row[valueKey];
    } else {
      normalizedRow.query = row.query;
      normalizedRow.searchInterest = row['search interest'];
      normalizedRow.increasePercent = row['increase percent'];
    }

    return normalizedRow;
  });
}