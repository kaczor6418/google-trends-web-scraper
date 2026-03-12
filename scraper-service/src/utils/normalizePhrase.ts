/**
 * Normalizes phrases to prevent duplicates like "Harry Potter" vs "harry potter".
 * @param phrase - Raw string from scraper.
 */
export const normalizePhrase = (phrase: string): string => {
  return phrase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
};