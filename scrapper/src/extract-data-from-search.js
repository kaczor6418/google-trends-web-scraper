import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startScraping } from './scraper/trendsScraper.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads the search configuration from a JSON file.
 * Defaults to 'search_queries.json' if no argument is provided.
 */
function loadQueries() {
  const filePath = process.argv[2] || path.join(__dirname, '../search_queries.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`[FATAL] Input file not found: ${filePath}`);
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Configuration object
const config = {
  chromeUrl: process.env.CHROME_DEBUG_URL || 'http://localhost:9222',
  apiUrl: process.env.BACKEND_API_URL,
  tempDir: path.join(__dirname, '../temp_downloads'),
  fallbackDir: path.join(__dirname, '../fallbacks')
};

const searchData = loadQueries();
startScraping(searchData, config);