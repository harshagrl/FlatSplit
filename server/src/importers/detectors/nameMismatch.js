/**
 * Detector: NAME_MISMATCH
 * 
 * Compare paid_by and split_with names against known member names.
 * Uses fuzzy matching: case-insensitive, trim, starts-with.
 * Severity: WARNING for paid_by, INFO for split_with.
 */

const { fuzzyMatchName, parseSplitWith } = require('../utils');

function detect(rows, members) {
  const anomalies = [];
  const memberNames = members.map(m => m.name);

  for (const row of rows) {
    // Check paid_by
    const paidBy = row.paid_by?.trim();
    if (paidBy) {
      const exactMatch = memberNames.find(
        m => m.toLowerCase() === paidBy.toLowerCase()
      );

      if (!exactMatch) {
        const fuzzy = fuzzyMatchName(paidBy, memberNames);
        if (fuzzy) {
          anomalies.push({
            row_number: row._row_number,
            anomaly_type: 'NAME_MISMATCH',
            severity: 'WARNING',
            description: `Payer "${paidBy}" doesn't exactly match any member. Did you mean "${fuzzy.match}"?`,
            original_value: paidBy,
            suggested_fix: fuzzy.match,
          });
        }
        // If no fuzzy match either, UNKNOWN_PARTICIPANT or MISSING_PAYER will catch it
      }
    }

    // Check split_with names
    const splitNames = parseSplitWith(row.split_with);
    for (const name of splitNames) {
      const exactMatch = memberNames.find(
        m => m.toLowerCase() === name.toLowerCase()
      );

      if (!exactMatch) {
        const fuzzy = fuzzyMatchName(name, memberNames);
        if (fuzzy) {
          anomalies.push({
            row_number: row._row_number,
            anomaly_type: 'NAME_MISMATCH',
            severity: 'INFO',
            description: `Split participant "${name}" doesn't exactly match any member. Auto-correcting to "${fuzzy.match}"`,
            original_value: name,
            suggested_fix: fuzzy.match,
          });
        }
      }
    }
  }

  return anomalies;
}

module.exports = { detect };
