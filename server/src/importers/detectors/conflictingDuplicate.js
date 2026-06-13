/**
 * Detector: CONFLICTING_DUPLICATE
 * 
 * Find rows with same date + similar description + same split_with
 * but different amounts or different paid_by.
 * Severity: WARNING (surface both to user)
 */

const { stringSimilarity, parseSplitWith } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];
  const flaggedPairs = new Set(); // Prevent duplicate flags

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];

      // Same date
      if (a.date?.trim() !== b.date?.trim()) continue;

      // Similar description (>= 50% word overlap)
      const similarity = stringSimilarity(a.description, b.description);
      if (similarity < 0.5) continue;

      // Same split_with (normalize and compare)
      const splitA = parseSplitWith(a.split_with).map(n => n.toLowerCase()).sort().join(',');
      const splitB = parseSplitWith(b.split_with).map(n => n.toLowerCase()).sort().join(',');
      if (splitA !== splitB) continue;

      // Different amount OR different paid_by
      const amountDiff = a.amount?.trim() !== b.amount?.trim();
      const payerDiff = a.paid_by?.trim()?.toLowerCase() !== b.paid_by?.trim()?.toLowerCase();

      if (!amountDiff && !payerDiff) continue; // This would be an exact duplicate, not conflicting

      const pairKey = `${a._row_number}-${b._row_number}`;
      if (flaggedPairs.has(pairKey)) continue;
      flaggedPairs.add(pairKey);

      const differences = [];
      if (amountDiff) differences.push(`amount: ${a.amount} vs ${b.amount}`);
      if (payerDiff) differences.push(`paid_by: ${a.paid_by} vs ${b.paid_by}`);

      // Flag both rows
      anomalies.push({
        row_number: a._row_number,
        anomaly_type: 'CONFLICTING_DUPLICATE',
        severity: 'WARNING',
        description: `Conflicts with row ${b._row_number}: same date and similar description "${a.description}" but different ${differences.join(', ')}. Review both rows.`,
        original_value: JSON.stringify({
          row: a._row_number,
          date: a.date,
          description: a.description,
          amount: a.amount,
          paid_by: a.paid_by,
        }),
        suggested_fix: null,
      });

      anomalies.push({
        row_number: b._row_number,
        anomaly_type: 'CONFLICTING_DUPLICATE',
        severity: 'WARNING',
        description: `Conflicts with row ${a._row_number}: same date and similar description "${b.description}" but different ${differences.join(', ')}. Review both rows.`,
        original_value: JSON.stringify({
          row: b._row_number,
          date: b.date,
          description: b.description,
          amount: b.amount,
          paid_by: b.paid_by,
        }),
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
