import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { startScraping } from './scraper/trendsScraper.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const searchMovie = [
  { 
    phrase: "Harry Potter", 
    timeframes: ["LAST_24_HOURS", { start: "11-02-2026", end: "18-02-2026" }], 
    geos: ["PL"] 
  }
];


const config = {
  chromeUrl: process.env.CHROME_DEBUG_URL || 'http://localhost:9222',
  apiUrl: process.env.BACKEND_API_URL,
  tempDir: path.join(__dirname, '../temp_downloads'),
  fallbackDir: path.join(__dirname, '../fallbacks')
};

startScraping(searchMovie, config);