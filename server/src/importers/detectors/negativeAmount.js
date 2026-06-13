/**
 * Detector: NEGATIVE_AMOUNT
 * 
 * Find rows where amount < 0.
 * Severity: INFO (treat as refund, not error)
 */

const { cleanAmount } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const amount = cleanAmount(row.amount);
    if (isNaN(amount)) continue;

    if (amount < 0) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'NEGATIVE_AMOUNT',
        severity: 'INFO',
        description: `Negative amount ${row.amount} detected for "${row.description}". Importing as refund expense.`,
        original_value: row.amount,
        suggested_fix: 'Import as refund expense (is_refund = true)',
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
