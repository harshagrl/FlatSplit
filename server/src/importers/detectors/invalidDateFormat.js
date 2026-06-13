/**
 * Detector: INVALID_DATE_FORMAT
 * 
 * Try to parse the date field.
 * Accept: DD-MM-YYYY, YYYY-MM-DD, "Mon-DD" (e.g. "Mar-14")
 * Severity: INFO if parseable (auto-fix to YYYY-MM-DD), ERROR if unparseable
 */

const { parseDate, formatDateISO } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const raw = row.date?.trim();
    if (!raw) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'INVALID_DATE_FORMAT',
        severity: 'ERROR',
        description: 'Date field is empty. Cannot import without a date.',
        original_value: '',
        suggested_fix: null,
      });
      continue;
    }

    // Check if it's already YYYY-MM-DD (standard format)
    const isStandard = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    if (isStandard) {
      const parsed = parseDate(raw);
      if (parsed && !isNaN(parsed.getTime())) continue; // All good
    }

    // Try to parse
    const parsed = parseDate(raw);

    if (parsed && !isNaN(parsed.getTime())) {
      const formatted = formatDateISO(parsed);
      // Only flag if the format needed conversion
      if (raw !== formatted) {
        anomalies.push({
          row_number: row._row_number,
          anomaly_type: 'INVALID_DATE_FORMAT',
          severity: 'INFO',
          description: `Date "${raw}" parsed as ${formatted}`,
          original_value: raw,
          suggested_fix: formatted,
        });
      }
    } else {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'INVALID_DATE_FORMAT',
        severity: 'ERROR',
        description: `Date "${raw}" could not be parsed. Accepted formats: DD-MM-YYYY, YYYY-MM-DD, Mon-DD (e.g. Mar-14)`,
        original_value: raw,
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
