/**
 * Detector: MISSING_PAYER
 * 
 * Find rows where paid_by is empty or whitespace only.
 * Severity: ERROR (blocks import of this row)
 */

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    if (!row.paid_by?.trim()) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'MISSING_PAYER',
        severity: 'ERROR',
        description: `Row ${row._row_number} has no payer specified. Cannot import without knowing who paid.`,
        original_value: row.paid_by || '',
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
