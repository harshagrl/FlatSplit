/**
 * Detector: EMPTY_SPLIT_WITH
 * 
 * Find rows where split_with is empty (no participants specified).
 * Severity: WARNING
 */

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    // Skip if this looks like a settlement (handled separately)
    const splitType = row.split_type?.trim().toLowerCase();
    const description = (row.description || '').toLowerCase();
    const notes = (row.notes || '').toLowerCase();
    const isSettlement = ['paid back', 'settlement', 'transfer'].some(
      kw => description.includes(kw) || notes.includes(kw)
    );
    if (isSettlement && !splitType) continue;

    if (!row.split_with?.trim()) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'EMPTY_SPLIT_WITH',
        severity: 'WARNING',
        description: `No participants specified in split_with for "${row.description}". Cannot determine who shares this expense.`,
        original_value: '',
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
