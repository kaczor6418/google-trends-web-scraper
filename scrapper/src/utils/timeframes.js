import { TIMEFRAME_CONFIG } from '../constants.js';

/**
 * Logic-driven timeframe generator.
 * Translates constants or date objects into Google Trends URL parameters.
 * * @param {string|Object} input - TimeframeRange (LAST_HOUR, LAST_4_HOURS, etc.)
 * @returns {Object} { label: string, param: string }
 */
export function resolveTimeframe(input) {
  let param;

  if (typeof input === 'string') {
    param = TIMEFRAME_CONFIG[input] || input;
  } else if (input?.start && input?.end) {
    const format = (dateStr) => {
      const [d, m, y] = dateStr.split('-');
      return `${y}-${m}-${d}`;
    };
    param = `${format(input.start)} ${format(input.end)}`;
  } else {
    param = "today 12-m";
  }

  return {
    rawInput: input, // This is exactly what the user provided
    param: param
  };
}