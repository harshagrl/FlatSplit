/**
 * CSV Parser — Converts raw CSV text to structured row objects
 * 
 * Handles:
 * - BOM character removal
 * - Header normalization (lowercase, trimmed)
 * - Strict header validation against expected columns
 * - Row numbering (accounting for header row)
 */

const { parse } = require('csv-parse/sync');

const EXPECTED_HEADERS = [
  'date', 'description', 'paid_by', 'amount', 'currency',
  'split_type', 'split_with', 'split_details', 'notes',
];

/**
 * Parse raw CSV text into an array of row objects.
 * Each row gets a _row_number property (1-indexed, accounting for header).
 * 
 * @param {string} csvText - Raw CSV content
 * @returns {{ rows: object[], headers: string[] }}
 * @throws {Error} if headers are missing or CSV is malformed
 */
function parseCSV(csvText) {
  // Remove BOM (UTF-8, UTF-16 LE/BE)
  let cleaned = csvText;
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1);
  }
  cleaned = cleaned.replace(/^\xEF\xBB\xBF/, '');

  // Parse with csv-parse
  const records = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty or contains only headers');
  }

  // Normalize all header names to lowercase trimmed
  const rows = records.map((record, index) => {
    const normalized = {};
    for (const [key, value] of Object.entries(record)) {
      normalized[key.toLowerCase().trim()] = value;
    }
    normalized._row_number = index + 2; // +2: 1-indexed + header row
    return normalized;
  });

  // Validate required headers exist
  const actualHeaders = Object.keys(rows[0]).filter(h => h !== '_row_number');
  const missingHeaders = EXPECTED_HEADERS.filter(h => !actualHeaders.includes(h));

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required CSV headers: ${missingHeaders.join(', ')}. ` +
      `Expected: ${EXPECTED_HEADERS.join(', ')}. ` +
      `Found: ${actualHeaders.join(', ')}`
    );
  }

  return { rows, headers: actualHeaders };
}

module.exports = { parseCSV, EXPECTED_HEADERS };
