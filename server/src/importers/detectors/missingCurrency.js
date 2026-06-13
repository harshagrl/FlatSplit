/**
 * Detector: MISSING_CURRENCY
 * 
 * Find rows where the currency field is empty.
 * Severity: INFO (auto-default to INR)
 */

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    if (!row.currency?.trim()) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'MISSING_CURRENCY',
        severity: 'INFO',
        description: `Currency is empty for "${row.description}". Defaulting to INR.`,
        original_value: '',
        suggested_fix: 'INR',
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
