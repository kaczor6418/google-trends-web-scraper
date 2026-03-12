/**
 * @fileoverview Main entry point for the scraper orchestration.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startScraping } from './scraper/trendsScraper.js';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Loads the search configuration from a JSON file.
 * Defaults to 'search_queries.json' if no argument is provided.
 * @returns {Array<Object>} The array of search queries.
 */
function loadQueries() {
  const filePath = process.argv[2] || path.join(__dirname, '../search_queries.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`[FATAL] Input file not found: ${filePath}`);
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Configuration object containing environment variables and paths.
 */
const config = {
  chromeUrl: process.env.CHROME_DEBUG_URL || 'http://localhost:9222',
  apiUrl: process.env.BACKEND_API_URL,
  tempDir: path.join(__dirname, '../temp_downloads'),
  fallbackDir: path.join(__dirname, '../fallbacks')
};

const searchData = loadQueries();
startScraping(searchData, config);