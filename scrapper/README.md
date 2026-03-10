# Google Trends Automation Agent

A production-grade, fault-tolerant web scraping agent designed to extract data from Google Trends. It utilizes **Playwright** for browser automation, **Human-like interaction** to bypass bot detection, and an **API-first persistence layer** with local fallback capabilities.

## Project Structure

```text
├── fallbacks/            # JSON files saved when the server is unreachable
├── src/
│   ├── scraper/
│   │   └── trendsScraper.js   # Main engine: navigates and extracts data
│   ├── utils/
│   │   ├── humanBehavior.js   # Anti-bot logic (scrolling, clicking, delays)
│   │   ├── persistence.js     # API sync and fallback storage logic
│   │   ├── retryFallbacks.js  # Script to re-sync local files to server
│   │   └── timeframes.js      # Timeframe resolution algorithm
│   └── index.js               # Entry point: loads config and starts scraper
├── temp_downloads/       # Temporary folder for CSVs before parsing
├── .env                  # Environment configuration
├── package.json          # Dependencies and scripts
└── search_queries.json   # Input search requirements

```

## Setup & Configuration

### Prerequisites

* **Node.js** (v18 or higher recommended)
* **Google Chrome** (Installed and accessible via command line)

### Environment Variables (`.env`)

Create a `.env` file in the root directory:

```env
CHROME_DEBUG_URL=http://localhost:9222
BACKEND_API_URL=http://localhost:3001/api/trends/snapshot
MIN_DELAY=2000
MAX_DELAY=5000

```

### Search Queries (`search_queries.json`)

The scraper accepts an array of objects. Timeframes support both constant strings and date ranges:

```json
[
  {
    "phrase": "Harry Potter",
    "timeframes": ["LAST_24_HOURS", { "start": "11-02-2026", "end": "18-02-2026" }],
    "geos": ["PL"]
  }
]

```

## How to Run

### 1. Launch Chrome in Debugging Mode

You must launch Chrome with the remote debugging port enabled **before** running the script.

* **Linux (Arch/Ubuntu):**
```bash
google-chrome-stable --remote-debugging-port=9222 --user-data-dir="$HOME/.config/chrome-automation"

```


* **Windows:**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-automation"

```



### 2. Available NPM Scripts

* `npm scrap-data`: Runs the scraper using the default `search_queries.json`.
* `npm scrap-data <path-to-file.json>`: Runs the scraper with a specific query file.
* `npm run sync-fallbacks`: Manually triggers the retry process to push `fallbacks/` files to your server.

---

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `./src/constants.js` | File with constant mapings used across project. |
| `./src/extract-data-from-search.js` | Entry point; parses command-line arguments and loads configurations. |
| `./src/retry-fallback-save.js` | Utility script to re-process files stored in the `fallbacks/` folder. |
| `./src/scraper/trendsScraper.js` | Orchestrates navigation, element detection, and the download-parse-sync loop. |
| `./src/utils/timeframes.js` | Algorithm to convert human-friendly timeframes into Google query parameters. |
| `./src/utils/humanBehavior.js` | Utilities for mouse movement, smooth scrolling, and randomized delays. |
| `./src/utils/persistence.js` | Handles API communication and writes failed requests to disk. |
| `./src/utils/normalizeScrapedData.js` | Normalize scraped data for better readbility. |