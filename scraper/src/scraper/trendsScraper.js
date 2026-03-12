/**
 * @fileoverview Trends Scraper Engine
 * Orchestrates navigation, human-like interaction, data normalization, 
 * and persistence to the backend or fallback storage.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import { WIDGET_TYPE_MAP, QUERY_TYPES } from '../constants.js';
import { resolveTimeframe } from '../utils/timeframes.js';
import { normalizeScrapedData } from '../utils/normalizeScrapedData.js';
import { humanDelay, humanLikeScroll, humanClick } from '../utils/humanBehavior.js';
import { sendResultToServer } from '../utils/persistence.js';

/**
 * Handles the logic for a single Google Trends page (one phrase + geo + timeframe).
 * * @param {import('playwright').Page} page - Playwright page instance.
 * @param {Object} entry - The search entry from search_queries.json.
 * @param {string|Object} timeframeInput - The timeframe to process.
 * @param {string} geo - The country code.
 * @param {Object} config - System configuration paths and URLs.
 */
async function processTrendsPage(page, entry, timeframeInput, geo, config) {
  const tf = resolveTimeframe(timeframeInput);
  const url = `https://trends.google.com/explore?q=${encodeURIComponent(entry.phrase)}&date=${encodeURIComponent(tf.param)}&geo=${geo}`;

  console.log(`\n[SCRAPE] Starting: ${entry.phrase} | GEO: ${geo} | TF: ${JSON.stringify(tf.rawInput)}`);
  
  try {
    // 1. Navigate and wait for initial load
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await humanDelay(5000, 8000); 

    const downloadBtnSelector = 'button:has(i:text("file_download")), button:has-text("download")';

    // 2. Human-like interaction: Scroll to trigger chart rendering
    await humanLikeScroll(page);
    await page.waitForSelector(downloadBtnSelector, { state: 'visible', timeout: 35000 });

    const buttons = page.locator(downloadBtnSelector);
    const count = await buttons.count();

    // 3. Iterate through available widgets (Interest, Top Queries, Rising Queries)
    for (let i = 0; i < count; i++) {
      const currentBtn = buttons.nth(i);
      await currentBtn.scrollIntoViewIfNeeded();
      await humanDelay(2000, 4000); // Wait before clicking

      const queryType = WIDGET_TYPE_MAP[i] || `UNKNOWN_WIDGET_${i}`;
      console.log(`   -> Downloading: ${queryType} (${i + 1}/${count})`);

      // 4. Handle the download event
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        humanClick(page, currentBtn)
      ]);

      const filePath = path.join(config.tempDir, download.suggestedFilename());
      await download.saveAs(filePath);

      // 5. Parse CSV and Normalize Data
      const rawJson = await csv().fromFile(filePath);
      const normalizedData = normalizeScrapedData(rawJson, queryType);

      // 6. Push to Backend (with Fallback logic)
      await sendResultToServer(
        {
          phrase: entry.phrase,
          timeframe: tf.rawInput,
          geo,
          queryType: queryType,
          extractedAt: new Date().toISOString(),
          data: normalizedData
        },
        config.apiUrl,
        config.fallbackDir
      );

      // 7. Cleanup temp file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      
      // Long delay between downloads to mimic human examination of charts
      await humanDelay(5000, 10000);
    }
  } catch (err) {
    console.error(`[SKIP] Error processing ${entry.phrase}: ${err.message}`);
    // Optional: Take a screenshot for debugging
    const errorImgPath = path.join(config.tempDir, `error-${entry.phrase}-${Date.now()}.png`);
    await page.screenshot({ path: errorImgPath });
  }
}

/**
 * Main entry point for the scraper engine.
 * * @param {Array} searchData - The list of queries loaded from JSON.
 * @param {Object} config - Global application configuration.
 */
export async function startScraping(searchData, config) {
  let browser;
  try {
    // Ensure vital directories exist
    [config.tempDir, config.fallbackDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    console.log(`Connecting to Chrome instance at: ${config.chromeUrl}`);
    browser = await chromium.connectOverCDP(config.chromeUrl);
    const context = browser.contexts()[0];
    const page = await context.newPage();

    // Set headers to look more like a standard browser request
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    // Iterate through the query matrix
    for (const item of searchData) {
      for (const time of item.timeframes) {
        for (const geo of item.geos) {
          await processTrendsPage(page, item, time, geo, config);
          
          console.log(`[COOL DOWN] Waiting before next query set...`);
          await humanDelay(15000, 25000);
        }
      }
    }
    
    console.log("\n[COMPLETE] All tasks in the queue have been processed.");

  } catch (err) {
    console.error("[FATAL ERROR] Scraper Engine crashed:", err);
  } finally {
    // We exit the process but don't close the browser (since it's a CDP connection)
    process.exit(0);
  }
}