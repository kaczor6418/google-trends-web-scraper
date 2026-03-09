import fs from 'fs';
import path from 'path';

/**
 * Saves result data to a local JSON file if the server is unreachable.
 */
export function saveToFallbackFile(result, fallbackDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const sanitizedPhrase = result.phrase.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const sanitizedTF = result.timeframe.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const filename = `fallback-[${sanitizedPhrase}-${result.geo}-${sanitizedTF}][${timestamp}].json`;
  const filePath = path.join(fallbackDir, filename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`[FALLBACK STORED] ${filename}`);
  } catch (err) {
    console.error(`[CRITICAL] Fallback write failed: ${err.message}`);
  }
}

/**
 * POSTs data to backend or triggers fallback.
 */
export async function sendResultToServer(newResult, apiUrl, fallbackDir) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResult)
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    console.log(`[SERVER OK] Data synced: ${newResult.phrase}`);
  } catch (err) {
    console.error(`[SERVER FAIL] ${err.message}. Saving to fallbacks.`);
    saveToFallbackFile(newResult, fallbackDir);
  }
}