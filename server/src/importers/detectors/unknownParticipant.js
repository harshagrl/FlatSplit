/**
 * Detector: UNKNOWN_PARTICIPANT
 * 
 * Check split_with for names not in the known members list.
 * Only flags names that don't have even a fuzzy match (fuzzy matches → NAME_MISMATCH).
 * Severity: WARNING
 */

const { parseSplitWith, fuzzyMatchName } = require('../utils');

function detect(rows, members) {
  const anomalies = [];
  const memberNames = members.map(m => m.name);

  for (const row of rows) {
    const splitNames = parseSplitWith(row.split_with);

    for (const name of splitNames) {
      const exactMatch = memberNames.find(
        m => m.toLowerCase() === name.trim().toLowerCase()
      );
      if (exactMatch) continue;

      const fuzzy = fuzzyMatchName(name, memberNames);
      if (fuzzy) continue; // Will be caught by NAME_MISMATCH detector

      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'UNKNOWN_PARTICIPANT',
        severity: 'WARNING',
        description: `"${name}" in split_with is not a known member and has no close match`,
        original_value: name,
        suggested_fix: 'Remove unknown participant, split among known members only',
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
