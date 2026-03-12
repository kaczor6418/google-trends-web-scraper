import fs from 'fs';
import path from 'path';

/**
 * Maps internal QUERY_TYPES to backend API sub-endpoints.
 * @param {string} queryType - The type of data being processed.
 * @returns {string} The corresponding API endpoint path.
 */
function getEndpointForType(queryType) {
  switch (queryType) {
    case 'INTEREST_OVER_TIME': return 'interest';
    case 'TOP_QUERIES': return 'top';
    case 'RISING_QUERIES': return 'rising';
    default: return 'unknown';
  }
}

/**
 * POSTs data to backend based on queryType or triggers local fallback.
 * @param {Object} newResult - The data object to send.
 * @param {string} apiUrl - The base URL of the API.
 * @param {string} fallbackDir - Directory to store JSON if the request fails.
 */
export async function sendResultToServer(newResult, apiUrl, fallbackDir) {
  const endpoint = getEndpointForType(newResult.queryType);
  const fullUrl = `${apiUrl}/${endpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResult)
    });
    
    if (!response.ok) throw new Error(`Status ${response.status}`);
    console.log(`[SERVER OK] Data synced to /${endpoint}: ${newResult.phrase}`);
  } catch (err) {
    console.error(`[SERVER FAIL] ${err.message}. Saving to fallbacks.`);
    saveToFallbackFile(newResult, fallbackDir);
  }
}

/**
 * Saves result data to a local JSON file if the server is unreachable.
 * @param {Object} result - The data object that failed to send.
 * @param {string} fallbackDir - The directory path for local storage.
 */
export function saveToFallbackFile(result, fallbackDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const sanitizedPhrase = result.phrase.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  // Ensure timeframe is a string for the filename even if it is an object
  const timeframeValue = typeof result.timeframe === 'string' 
    ? result.timeframe 
    : JSON.stringify(result.timeframe);
  const sanitizedTF = timeframeValue.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const filename = `fallback-[${sanitizedPhrase}-${result.geo}-${sanitizedTF}][${timestamp}].json`;
  const filePath = path.join(fallbackDir, filename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`[FALLBACK STORED] ${filename}`);
  } catch (err) {
    console.error(`[CRITICAL] Fallback write failed: ${err.message}`);
  }
}