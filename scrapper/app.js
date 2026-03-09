const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');

// --- CONFIGURATION ---
const OUTPUT_FILE = 'scraped_trends_data.json';
const DOWNLOAD_TEMP_DIR = path.join(__dirname, 'temp_downloads');
const CHROME_DEBUG_URL = 'http://localhost:9222';

// --- HELPERS ---

async function humanLikeScroll(page, selector = ".Jh24Ne") {
  await page.evaluate(async (sel) => {
    // 1. Find the container or fallback to the main document
    let container = document.querySelector(sel) || document.documentElement;

    await new Promise((resolve) => {
      let totalFetchedHeight = 0;

      const scrollStep = () => {
        // Generate random values for this specific "flick"
        const randomDistance = Math.floor(Math.random() * 200) + 150;
        const randomDelay = Math.floor(Math.random() * 150) + 100;

        container.scrollBy({
          top: randomDistance,
          behavior: 'smooth'
        });

        totalFetchedHeight += randomDistance;

        // Condition: Stop if we've reached the actual bottom of the scrollable area
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;

        if (isAtBottom) {
          resolve();
        } else {
          // Use the randomDelay to vary the pace between scrolls
          setTimeout(scrollStep, randomDelay);
        }
      };

      scrollStep();
    });
  }, selector);
}

// --- TIMEFRAME NORMALIZATION ---

// Human-friendly labels -> Google Trends `date=` param
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

// Reverse lookup so if user passes "now 7-d" we can still store a nice label
const TIMEFRAME_REVERSE_MAP = new Map(
  Array.from(TIMEFRAME_MAP.entries()).map(([label, param]) => [param, label])
);

/**
 * Accepts either:
 *  - Human label: "Past week"
 *  - Raw Google Trends param: "now 7-d", "today 3-m", "all", "YYYY-MM-DD YYYY-MM-DD"
 *
 * Returns: { label, param }
 */

// --- WIDGET NAME NORMALIZATION ---
const WIDGET_NAME_BY_INDEX = {
  0: "Interest over time",
  1: "Top queries",
  2: "Rising queries",
};

function getWidgetName(i) {
  return WIDGET_NAME_BY_INDEX[i] ?? `Widget ${i}`;
}

function normalizeTimeframe(timeframeInput) {
  if (timeframeInput == null) {
    return { label: "past year", param: "today 12-m" };
  }

  const raw = String(timeframeInput).trim();

  // If it's one of our human labels (case-insensitive)
  const key = raw.toLowerCase();
  if (TIMEFRAME_MAP.has(key)) {
    return { label: raw, param: TIMEFRAME_MAP.get(key) };
  }

  // Otherwise assume it's already a valid `date=` value (e.g. "now 7-d", "today 12-m", "all", "2025-01-01 2025-02-01")
  const knownLabel = TIMEFRAME_REVERSE_MAP.get(raw);
  return { label: knownLabel ? knownLabel : raw, param: raw };
}

/**
 * Generates a random delay to mimic human hesitation
 */
const humanDelay = (min = 2000, max = 5000) =>
  new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Mimics a human mouse movement and click
 */
async function humanClick(page, locator) {
  const box = await locator.boundingBox();
  if (box) {
    // Move to a random point within the button (not the exact center)
    await page.mouse.move(
      box.x + box.width / 2 + (Math.random() * 10 - 5),
      box.y + box.height / 2 + (Math.random() * 10 - 5),
      { steps: 15 } // Smooth transition
    );
    await humanDelay(600, 1200);
    await page.mouse.down();
    await humanDelay(100, 200); // Hold time
    await page.mouse.up();
  } else {
    await locator.click(); // Fallback if bounding box fails
  }
}

/**
 * Replace local file saving with an API POST request to the Express server
 */
async function sendResultToServer(newResult) {
  try {
    const response = await fetch('http://localhost:3001/api/trends/snapshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newResult)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Server returned ${response.status}: ${errBody}`);
    }
    console.log(`[SUCCESS] Data injected to server for: ${newResult.phrase} (${newResult.geo})`);
  } catch (err) {
    console.error(`[ERROR] Failed to send data to server: ${err.message}`);
    // Optionally fallback to JSON here
    appendResultToFileFallback(newResult);
  }
}

/**
 * Fallback to JSON file if the server is offline
 */
function appendResultToFileFallback(newResult) {
  let currentData = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
      currentData = fileContent ? JSON.parse(fileContent) : [];
    } catch (err) {
      console.error("Error reading JSON file, initializing new list.");
      currentData = [];
    }
  }
  currentData.push(newResult);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(currentData, null, 2));
  console.log(`[FALLBACK SUCCESS] Data persisted locally for: ${newResult.phrase} (${newResult.geo})`);
}

/**
 * The Core Scraping Logic for one specific URL
 */
async function scrapeTrendsWidget(page, entry, timeframeInput, geo) {
  const tf = normalizeTimeframe(timeframeInput);
  const url = `https://trends.google.com/explore?q=${encodeURIComponent(entry.phrase)}&date=${encodeURIComponent(tf.param)}&geo=${geo}`;

  console.log(`\n--- Navigating to: ${entry.phrase} [${geo}] ---`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Give the charts plenty of time to render - Google is heavy
  await humanDelay(5000, 8000);

  const downloadButtonSelector = 'button:has(i:text("file_download")), button:has-text("download")';

  try {
    await humanLikeScroll(page);
    await page.waitForSelector(downloadButtonSelector, { state: 'visible', timeout: 35000 });
  } catch (e) {
    console.warn(`[TIMEOUT] Could not find download buttons for ${entry.phrase}. Saving debug.png`);
    await page.screenshot({ path: `error_${entry.phrase}_${geo}.png` });
    return;
  }

  const buttons = page.locator(downloadButtonSelector);
  const count = await buttons.count();
  console.log(`Found ${count} widgets. Starting downloads...`);

  if (!fs.existsSync(DOWNLOAD_TEMP_DIR)) fs.mkdirSync(DOWNLOAD_TEMP_DIR);

  for (let i = 0; i < count; i++) {
    try {
      const currentBtn = buttons.nth(i);
      await currentBtn.scrollIntoViewIfNeeded();
      await humanDelay(1500, 3000);

      console.log(`   Action: Clicking download button ${i + 1}/${count}...`);

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        humanClick(page, currentBtn)
      ]);

      const filePath = path.join(DOWNLOAD_TEMP_DIR, download.suggestedFilename());
      await download.saveAs(filePath);

      const jsonData = await csv().fromFile(filePath);

      const widgetName = getWidgetName(i);

      await sendResultToServer({
        phrase: entry.phrase,
        timeframe: tf.label,           // nice label, e.g. "Past week"
        geo,
        widget: widgetName,
        extractedAt: new Date().toISOString(),
        data: jsonData
      });

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Long pause between individual file downloads to satisfy rate limiters
      await humanDelay(4000, 8000);

    } catch (err) {
      console.error(`   [ERROR] Widget ${i} failed: ${err.message}`);
      // If Google blocks us, take a long "human" break
      await humanDelay(15000, 30000);
    }
  }
}

/**
 * Orchestrator
 */
async function startScraping(searchMovie) {
  let browser;
  try {
    console.log(`Connecting to Chrome on ${CHROME_DEBUG_URL}...`);
    browser = await chromium.connectOverCDP(CHROME_DEBUG_URL);
    const context = browser.contexts()[0];
    const page = await context.newPage();

    // Optional: Set a realistic user agent if CDP doesn't inherit it perfectly
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    for (const item of searchMovie) {
      for (const time of item.timeframes) {
        for (const geo of item.geos) {
          await scrapeTrendsWidget(page, item, time, geo);

          // Pause between different search queries
          console.log("Waiting before next query...");
          await humanDelay(10000, 20000);
        }
      }
    }

    console.log("\n[FINISH] All tasks completed successfully.");

  } catch (err) {
    console.error("[FATAL ERROR] Check if Chrome is running with --remote-debugging-port=9222");
    console.error(err);
  } finally {
    // Note: We close the page, but not the browser, because we are connected via CDP
    process.exit(0);
  }
}

// --- INPUT DATA ---
const searchMovie = [
  { phrase: "Harry Potter", timeframes: ["Past 24 hours"], geos: ["PL"] },
  { phrase: "Lord of the Rings", timeframes: ["Past month"], geos: ["US", "PL"] },
  { phrase: "Game of Thrones", timeframes: ["Past week", "Past year"], geos: ["PL"] }
];

// Start the process
startScraping(searchMovie);
