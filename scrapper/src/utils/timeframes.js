/**
 * Logic-driven timeframe generator.
 * Translates constants or date objects into Google Trends URL parameters.
 * * @param {string|Object} input - TimeframeRange (LAST_HOUR, LAST_4_HOURS, etc.)
 * @returns {Object} { label: string, param: string }
 */
export function resolveTimeframe(input) {
  if (typeof input === 'string') {
    switch (input) {
      case "LAST_HOUR": return { label: "Last Hour", param: "now 1-H" };
      case "LAST_4_HOURS": return { label: "Last 4 Hours", param: "now 4-H" };
      case "LAST_24_HOURS": return { label: "Last 24 Hours", param: "now 1-d" };
      default: return { label: input, param: input };
    }
  }

  if (input?.start && input?.end) {
    const format = (dateStr) => {
      const [d, m, y] = dateStr.split('-');
      return `${y}-${m}-${d}`;
    };
    
    const startFormatted = format(input.start);
    const endFormatted = format(input.end);
    
    return {
      label: `${input.start} to ${input.end}`,
      param: `${startFormatted} ${endFormatted}`
    };
  }

  return { label: "Past Year", param: "today 12-m" };
}