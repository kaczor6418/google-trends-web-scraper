/**
 * @fileoverview Fallback Sync Utility
 * Scans the 'fallbacks/' directory for pending JSON data, attempts to 
 * POST each file to the backend, and deletes it upon confirmed success.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.join(__dirname, '../fallbacks');
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001/api/trends/snapshot';

/**
 * Reads, attempts to sync, and cleans up fallback files.
 * Files are processed chronologically based on their timestamp pattern.
 */
async function processFallbacks() {
  if (!fs.existsSync(FALLBACK_DIR)) {
    console.warn("[SYNC] Fallback directory does not exist.");
    return;
  }

  // Read files and sort them chronologically by filename (which includes the timestamp)
  const files = fs.readdirSync(FALLBACK_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log("[SYNC] No pending files to process.");
    return;
  }

  console.log(`[SYNC] Found ${files.length} pending files. Beginning batch upload...`);
  let successCount = 0;

  for (const file of files) {
    const filePath = path.join(FALLBACK_DIR, file);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        fs.unlinkSync(filePath);
        console.log(`[SUCCESS] Synced and removed: ${file}`);
        successCount++;
      } else {
        console.warn(`[RETRY] Server rejected ${file} with status: ${response.status}`);
      }
    } catch (err) {
      console.error(`[CRITICAL] Connection failed for ${file}: ${err.message}`);
    }
  }

  console.log(`\n[SYNC SUMMARY] Successfully cleared ${successCount}/${files.length} files.`);
}

// Execute the sync process
processFallbacks();