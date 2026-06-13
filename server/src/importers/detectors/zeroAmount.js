/**
 * Detector: ZERO_AMOUNT
 * 
 * Find rows where amount = 0.
 * Severity: WARNING (skip row)
 */

const { cleanAmount } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const amount = cleanAmount(row.amount);
    if (isNaN(amount)) continue;

    if (amount === 0) {
      const notesContext = row.notes?.trim() ? ` Notes: "${row.notes.trim()}"` : '';
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'ZERO_AMOUNT',
        severity: 'WARNING',
        description: `Zero amount for "${row.description}". This row will be skipped.${notesContext}`,
        original_value: row.amount,
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
