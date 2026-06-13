/**
 * Detector: EXACT_DUPLICATE
 * 
 * Find rows where date + description (case-insensitive) + amount + paid_by all match.
 * Keep the row with notes, flag the other.
 */

function detect(rows, _members) {
  const anomalies = [];
  const seen = new Map(); // composite key → row

  for (const row of rows) {
    const key = [
      row.date?.toLowerCase()?.trim(),
      row.description?.toLowerCase()?.trim(),
      row.amount?.trim(),
      row.paid_by?.toLowerCase()?.trim(),
    ].join('|');

    if (seen.has(key)) {
      const firstRow = seen.get(key);
      const currentHasNotes = !!row.notes?.trim();
      const firstHasNotes = !!firstRow.notes?.trim();

      // Decide which to flag: prefer to keep the one with notes
      let flaggedRow, keptRow;
      if (currentHasNotes && !firstHasNotes) {
        flaggedRow = firstRow;
        keptRow = row;
        seen.set(key, row); // Update to keep current
      } else {
        flaggedRow = row;
        keptRow = firstRow;
      }

      anomalies.push({
        row_number: flaggedRow._row_number,
        anomaly_type: 'EXACT_DUPLICATE',
        severity: 'WARNING',
        description: `Exact duplicate of row ${keptRow._row_number}: "${row.description}" on ${row.date} for ${row.amount} paid by ${row.paid_by}`,
        original_value: JSON.stringify({
          date: flaggedRow.date,
          description: flaggedRow.description,
          amount: flaggedRow.amount,
          paid_by: flaggedRow.paid_by,
        }),
        suggested_fix: null,
      });
    } else {
      seen.set(key, row);
    }
  }

  return anomalies;
}

module.exports = { detect };
