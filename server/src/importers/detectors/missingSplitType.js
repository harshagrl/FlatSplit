/**
 * Detector: MISSING_SPLIT_TYPE
 * 
 * Find rows where split_type is empty and the row is not a settlement.
 * Severity: WARNING
 */

const SETTLEMENT_KEYWORDS = ['paid back', 'settlement', 'transfer', 'repaid', 'settled'];

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const splitType = row.split_type?.trim();
    if (splitType) continue;

    // Skip if this looks like a settlement (handled by settlementDetected)
    const description = (row.description || '').toLowerCase();
    const notes = (row.notes || '').toLowerCase();
    const isSettlement = SETTLEMENT_KEYWORDS.some(
      kw => description.includes(kw) || notes.includes(kw)
    );
    if (isSettlement) continue;

    anomalies.push({
      row_number: row._row_number,
      anomaly_type: 'MISSING_SPLIT_TYPE',
      severity: 'WARNING',
      description: `No split type specified for "${row.description}". Defaulting to EQUAL split.`,
      original_value: '',
      suggested_fix: 'EQUAL',
    });
  }

  return anomalies;
}

module.exports = { detect };
