import dotenv from 'dotenv';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csvtojson';

dotenv.config();

// --- ESM PATH HELPERS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const CHROME_DEBUG_URL = process.env.CHROME_DEBUG_URL || 'http://localhost:9222';
const DOWNLOAD_TEMP_DIR = process.env.DOWNLOAD_TEMP_DIR || path.join(__dirname, 'temp_downloads');
const FALLBACK_DIR = path.join(__dirname, 'fallbacks');
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001/api/trends/snapshot';

// Ensure directories exist
[DOWNLOAD_TEMP_DIR, FALLBACK_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// --- HELPERS ---

const humanDelay = (min = process.env.MIN_DELAY || 2000, max = process.env.MAX_DELAY || 5000) =>
  new Promise(res => setTimeout(res, Math.floor(Math.random() * (Number(max) - Number(min) + 1) + Number(min))));

function generateFallbackFilename(result) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('Z')[0];
  
  const sanitizedPhrase = result.phrase.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const sanitizedTF = result.timeframe.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  return `fallback-[${sanitizedPhrase}-${result.geo}-${sanitizedTF}][${timestamp}].json`;
}

const TIMEFRAME_MAP = new Map([
  ["past 24 hours", "now 1-d"],
  ["past day", "now 1-d"],
  ["past week", "now 7-d"],
  ["past 7 days", "now 7-d"],
  ["past month", "today 1-m"],
  ["past 30 days", "today 1-m"],
  ["past 3 months", "today 3-m"],
  ["past 90 days", "today 3-m"],
  ["past year", "today 12-m"],
  ["past 12 months", "today 12-m"],
]);

const TIMEFRAME_REVERSE_MAP = new Map(
  Array.from(TIMEFRAME_MAP.entries()).map(([label, param]) => [param, label])
);

const WIDGET_NAME_BY_INDEX = {
  0: "Interest over time",
  1: "Top queries",
  2: "Rising queries",
};

function normalizeTimeframe(timeframeInput) {
  if (timeframeInput == null) return { label: "past year", param: "today 12-m" };
  const raw = String(timeframeInput).trim();
  const key = raw.toLowerCase();
  if (TIMEFRAME_MAP.has(key)) return { label: raw, param: TIMEFRAME_MAP.get(key) };
  const knownLabel = TIMEFRAME_REVERSE_MAP.get(raw);
  return { label: knownLabel ? knownLabel : raw, param: raw };
}

async function humanLikeScroll(page, selector = ".Jh24Ne") {
  await page.evaluate(async (sel) => {
    let container = document.querySelector(sel) || document.documentElement;
    await new Promise((resolve) => {
      const scrollStep = () => {
        const randomDistance = Math.floor(Math.random() * 200) + 150;
        const randomDelay = Math.floor(Math.random() * 150) + 100;
        container.scrollBy({ top: randomDistance, behavior: 'smooth' });
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        if (isAtBottom) resolve();
        else setTimeout(scrollStep, randomDelay);
      };
      scrollStep();
    });
  }, selector);
}

async function humanClick(page, locator) {
  const box = await locator.boundingBox();
  if (box) {
    await page.mouse.move(
      box.x + box.width / 2 + (Math.random() * 10 - 5),
      box.y + box.height / 2 + (Math.random() * 10 - 5),
      { steps: 15 }
    );
    await humanDelay(600, 1200);
    await page.mouse.down();
    await humanDelay(100, 200);
    await page.mouse.up();
  } else {
    await locator.click();
  }
}

/**
 * Persists data to the fallback directory
 */
function saveToFallbackFile(result) {
  const filename = generateFallbackFilename(result);
  const filePath = path.join(FALLBACK_DIR, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`[FALLBACK STORED] ${filename}`);
  } catch (err) {
    console.error(`[CRITICAL] Could not write fallback: ${err.message}`);
  }
}

/**
 * Template for server communication
 */
async function sendResultToServer(newResult) {
  try {
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResult)
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    console.log(`[SERVER OK] Data synced for: ${newResult.phrase}`);
  } catch (err) {
    console.error(`[SERVER FAIL] ${err.message}. Redirecting to fallbacks.`);
    saveToFallbackFile(newResult);
  }
}

/**
 * Main Scraping Logic
 */
async function scrapeTrendsWidget(page, entry, timeframeInput, geo) {
  const tf = normalizeTimeframe(timeframeInput);
  const url = `https://trends.google.com/explore?q=${encodeURIComponent(entry.phrase)}&date=${encodeURIComponent(tf.param)}&geo=${geo}`;

  console.log(`\n--- Processing: ${entry.phrase} [${geo}] ---`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await humanDelay(5000, 8000);

  const downloadButtonSelector = 'button:has(i:text("file_download")), button:has-text("download")';

  try {
    await humanLikeScroll(page);
    await page.waitForSelector(downloadButtonSelector, { state: 'visible', timeout: 35000 });
  } catch (e) {
    console.warn(`[SKIP] Elements not visible for ${entry.phrase}.`);
    await page.screenshot({ path: path.join(__dirname, `error_${entry.phrase}.png`) });
    return;
  }

  const buttons = page.locator(downloadButtonSelector);
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    try {
      const currentBtn = buttons.nth(i);
      await currentBtn.scrollIntoViewIfNeeded();
      await humanDelay(1500, 3000);

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        humanClick(page, currentBtn)
      ]);

      const filePath = path.join(DOWNLOAD_TEMP_DIR, download.suggestedFilename());
      await download.saveAs(filePath);

      const jsonData = await csv().fromFile(filePath);
      const widgetName = WIDGET_NAME_BY_INDEX[i] ?? `Widget ${i}`;

      await sendResultToServer({
        phrase: entry.phrase,
        timeframe: tf.label,
        geo,
        widget: widgetName,
        extractedAt: new Date().toISOString(),
        data: jsonData
      });

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await humanDelay(4000, 8000);

    } catch (err) {
      console.error(`   [WIDGET ERROR] Index ${i}: ${err.message}`);
      await humanDelay(10000, 20000);
    }
  }
}

async function startScraping(searchMovie) {
  try {
    console.log(`Connecting to CDP: ${CHROME_DEBUG_URL}`);
    const browser = await chromium.connectOverCDP(CHROME_DEBUG_URL);
    const context = browser.contexts()[0];
    const page = await context.newPage();

    for (const item of searchMovie) {
      for (const time of item.timeframes) {
        for (const geo of item.geos) {
          await scrapeTrendsWidget(page, item, time, geo);
          console.log("Query cooldown...");
          await humanDelay(12000, 20000);
        }
      }
    }
    console.log("\n[COMPLETE] All tasks processed.");
  } catch (err) {
    console.error("[FATAL]", err);
  } finally {
    process.exit(0);
  }
}

// --- RUN ---
const searchMovie = [
  { phrase: "Harry Potter", timeframes: ["Past 24 hours"], geos: ["PL"] },
  { phrase: "Lord of the Rings", timeframes: ["Past month"], geos: ["US"] }
];

startScraping(searchMovie);