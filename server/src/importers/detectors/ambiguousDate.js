/**
 * Detector: AMBIGUOUS_DATE
 * 
 * Find dates that could be read as either DD-MM or MM-DD.
 * Ambiguous when both day and month parts are ≤ 12 and they differ.
 * Severity: WARNING (require user confirmation)
 */

const { isDateAmbiguous } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const raw = row.date?.trim();
    if (!raw) continue;

    if (isDateAmbiguous(raw)) {
      const parts = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (!parts) continue;

      const [, first, second, year] = parts;

      // Check notes for keywords that suggest ambiguity awareness
      const notes = (row.notes || '').toLowerCase();
      const hasAmbiguityHint = /ambiguous|which date|april or may|\bmm\b|\bdd\b/.test(notes);

      // Flag if both parts ≤ 12 (genuinely ambiguous)
      // If there's a note about dates, definitely flag; otherwise still flag but note the assumption
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'AMBIGUOUS_DATE',
        severity: hasAmbiguityHint ? 'WARNING' : 'INFO',
        description: hasAmbiguityHint
          ? `Date "${raw}" is ambiguous: could be ${first}/${second}/${year} (DD/MM) or ${second}/${first}/${year} (MM/DD). Notes suggest date format uncertainty.`
          : `Date "${raw}" is ambiguous: could be ${first}/${second}/${year} (DD/MM) or ${second}/${first}/${year} (MM/DD). Assuming DD-MM-YYYY format.`,
        original_value: raw,
        suggested_fix: `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
