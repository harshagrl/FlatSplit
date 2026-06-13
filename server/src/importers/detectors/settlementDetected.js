/**
 * Detector: SETTLEMENT_DETECTED
 * 
 * Find rows that look like settlements rather than expenses:
 * - split_type is empty AND (description or notes contain settlement keywords)
 * Severity: WARNING
 */

const SETTLEMENT_KEYWORDS = ['paid back', 'settlement', 'transfer', 'repaid', 'settled'];

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const splitType = row.split_type?.trim().toLowerCase();
    // Only flag if split_type is empty (settlements don't have a split type)
    if (splitType) continue;

    const description = (row.description || '').toLowerCase();
    const notes = (row.notes || '').toLowerCase();

    const isSettlement = SETTLEMENT_KEYWORDS.some(
      kw => description.includes(kw) || notes.includes(kw)
    );

    if (isSettlement) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'SETTLEMENT_DETECTED',
        severity: 'WARNING',
        description: `Row looks like a settlement, not an expense: "${row.description}". Consider importing as a Settlement record.`,
        original_value: row.description,
        suggested_fix: 'Import as Settlement record instead of Expense',
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
