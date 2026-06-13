/**
 * Detector: FORMAT_ERROR
 * 
 * Find amounts with commas (e.g. "1,200") or other formatting issues.
 * Severity: INFO (auto-fix by removing commas)
 */

const { cleanAmount } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const raw = row.amount?.trim();
    if (!raw) continue;

    // Check for commas in numeric values (e.g., "1,200" or "1,200.50")
    if (raw.includes(',')) {
      const cleaned = cleanAmount(raw);
      if (!isNaN(cleaned)) {
        anomalies.push({
          row_number: row._row_number,
          anomaly_type: 'FORMAT_ERROR',
          severity: 'INFO',
          description: `Amount "${raw}" contains commas. Auto-fixing to ${cleaned}`,
          original_value: raw,
          suggested_fix: String(cleaned),
        });
      }
    }
  }

  return anomalies;
}

module.exports = { detect };
