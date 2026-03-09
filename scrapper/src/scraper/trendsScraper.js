import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import { resolveTimeframe } from '../utils/timeframes.js';
import { humanDelay, humanLikeScroll, humanClick } from '../utils/humanBehavior.js';
import { sendResultToServer } from '../utils/persistence.js';

/**
 * Normalizes widget indices to human-readable names.
 */
const WIDGET_NAME_BY_INDEX = {
  0: "Interest over time",
  1: "Top queries",
  2: "Rising queries",
};

/**
 * Orchestrates the navigation and data extraction for a single search configuration.
 * * @param {import('playwright').Page} page - Active Playwright page instance.
 * @param {Object} entry - Search object (phrase, etc.).
 * @param {string|Object} timeframeInput - Constant or {start, end} object.
 * @param {string} geo - Region code.
 * @param {Object} config - System configuration (dirs, URLs).
 */
async function processTrendsPage(page, entry, timeframeInput, geo, config) {
  const tf = resolveTimeframe(timeframeInput);
  const url = `https://trends.google.com/explore?q=${encodeURIComponent(entry.phrase)}&date=${encodeURIComponent(tf.param)}&geo=${geo}`;

  console.log(`\n[SCRAPE] ${entry.phrase} | ${geo} | ${tf.label}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await humanDelay(5000, 8000); // Wait for JS hydration

    const downloadBtnSelector = 'button:has(i:text("file_download")), button:has-text("download")';

    // Simulate user reading the page before interacting
    await humanLikeScroll(page);
    await page.waitForSelector(downloadBtnSelector, { state: 'visible', timeout: 35000 });

    const buttons = page.locator(downloadBtnSelector);
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const currentBtn = buttons.nth(i);
      await currentBtn.scrollIntoViewIfNeeded();
      await humanDelay(1500, 3000);

      console.log(`   -> Downloading Widget ${i + 1}/${count}`);

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        humanClick(page, currentBtn)
      ]);

      const filePath = path.join(config.tempDir, download.suggestedFilename());
      await download.saveAs(filePath);

      const jsonData = await csv().fromFile(filePath);
      const widgetName = WIDGET_NAME_BY_INDEX[i] ?? `Widget ${i}`;

      // Dispatch data to server/fallback
      await sendResultToServer(
        {
          phrase: entry.phrase,
          timeframe: tf.label,
          geo,
          widget: widgetName,
          extractedAt: new Date().toISOString(),
          data: jsonData
        },
        config.apiUrl,
        config.fallbackDir
      );

      // Clean up the CSV file immediately after parsing
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      
      // Pause to prevent rapid-fire download detection
      await humanDelay(4000, 8000);
    }
  } catch (err) {
    console.error(`[SKIP] Failed ${entry.phrase}: ${err.message}`);
  }
}

/**
 * Main entry point for the scraper engine.
 * * @param {Array} searchMovie - The list of phrases and timeframes.
 * @param {Object} config - Global app configuration.
 */
export async function startScraping(searchMovie, config) {
  let browser;
  try {
    // Ensure temp/fallback directories exist
    [config.tempDir, config.fallbackDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    console.log(`Connecting to CDP: ${config.chromeUrl}`);
    browser = await chromium.connectOverCDP(config.chromeUrl);
    const context = browser.contexts()[0];
    const page = await context.newPage();

    // Loop through the search matrix
    for (const item of searchMovie) {
      for (const time of item.timeframes) {
        for (const geo of item.geos) {
          await processTrendsPage(page, item, time, geo, config);
          
          console.log("Cooling down between queries...");
          await humanDelay(12000, 20000);
        }
      }
    }
    console.log("\n[SUCCESS] Extraction cycle finished.");
  } catch (err) {
    console.error("[FATAL ENGINE ERROR]", err);
  } finally {
    process.exit(0);
  }
}