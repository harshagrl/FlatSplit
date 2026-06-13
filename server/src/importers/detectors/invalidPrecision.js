/**
 * Detector: INVALID_PRECISION
 * 
 * Find amounts with more than 2 decimal places.
 * Severity: INFO (auto-fix by rounding to 2 decimal places)
 */

const { cleanAmount } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const raw = row.amount?.trim();
    if (!raw) continue;

    const cleaned = cleanAmount(raw);
    if (isNaN(cleaned)) continue;

    // Check decimal places
    const parts = String(cleaned).split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      const rounded = Number(cleaned.toFixed(2));
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'INVALID_PRECISION',
        severity: 'INFO',
        description: `Amount "${raw}" has more than 2 decimal places. Auto-rounding to ${rounded}`,
        original_value: raw,
        suggested_fix: String(rounded),
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
