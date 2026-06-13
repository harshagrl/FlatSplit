/**
 * Shared utilities for the CSV import engine
 */

const MONTH_NAMES = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a date string into a Date object.
 * Accepts: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, "Mon-DD" (e.g. "Mar-14" → 2026-03-14)
 * Returns null if unparseable.
 */
function parseDate(dateStr) {
  if (!dateStr?.trim()) return null;
  const trimmed = dateStr.trim();

  // YYYY-MM-DD (ISO)
  const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Mon-DD (e.g. "Mar-14") → assume year 2026
  const monDay = trimmed.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (monDay) {
    const monthIdx = MONTH_NAMES[monDay[1].toLowerCase()];
    if (monthIdx !== undefined) {
      return new Date(2026, monthIdx, Number(monDay[2]));
    }
  }

  return null;
}

/**
 * Format a Date object as YYYY-MM-DD string
 */
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if a date string is ambiguous (both DD and MM parts are ≤ 12)
 */
function isDateAmbiguous(dateStr) {
  if (!dateStr?.trim()) return false;
  const trimmed = dateStr.trim();

  // Only DD-MM-YYYY / DD/MM/YYYY can be ambiguous
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!dmy) return false;

  const first = Number(dmy[1]);
  const second = Number(dmy[2]);

  // Ambiguous only if both parts could be day OR month, and they're different
  return first <= 12 && second <= 12 && first !== second;
}

/**
 * Parse the split_with field into an array of trimmed names
 */
function parseSplitWith(str) {
  if (!str?.trim()) return [];
  return str.split(',').map(n => n.trim()).filter(Boolean);
}

/**
 * Parse the split_details field into an array of numbers
 */
function parseSplitDetails(str) {
  if (!str?.trim()) return [];
  return str.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
}

/**
 * Clean an amount string: remove commas and currency symbols, parse to float
 */
function cleanAmount(amountStr) {
  if (!amountStr?.trim()) return NaN;
  return parseFloat(amountStr.replace(/[,₹$]/g, '').trim());
}

/**
 * Find the best fuzzy match for a name against known member names.
 * Returns { match, score } or null if no match found.
 */
function fuzzyMatchName(name, memberNames) {
  if (!name?.trim()) return null;
  const normalized = name.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exact = memberNames.find(m => m.toLowerCase() === normalized);
  if (exact) return { match: exact, score: 1.0 };

  // Starts-with match (e.g., "Ai" → "Aisha")
  const startsWith = memberNames.find(m => m.toLowerCase().startsWith(normalized));
  if (startsWith) return { match: startsWith, score: 0.8 };

  // Reverse starts-with (e.g., "Aisha K" → "Aisha")
  const reverseStartsWith = memberNames.find(
    m => normalized.startsWith(m.toLowerCase())
  );
  if (reverseStartsWith) return { match: reverseStartsWith, score: 0.7 };

  return null;
}

/**
 * Simple word-overlap similarity between two strings (0-1)
 */
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

module.exports = {
  parseDate,
  formatDateISO,
  isDateAmbiguous,
  parseSplitWith,
  parseSplitDetails,
  cleanAmount,
  fuzzyMatchName,
  stringSimilarity,
  MONTH_NAMES,
};
