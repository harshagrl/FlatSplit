/**
 * Detector: POST_DEPARTURE_EXPENSE
 * 
 * Check if any member in split_with has a left_at date
 * that is before the expense date.
 * Severity: WARNING
 * Loads member data from database to get left_at dates.
 */

const { parseDate, parseSplitWith, formatDateISO, fuzzyMatchName } = require('../utils');

function detect(rows, members) {
  const anomalies = [];

  // Build lookup: lowercased name → member record
  const memberLookup = {};
  for (const m of members) {
    memberLookup[m.name.toLowerCase()] = m;
  }

  for (const row of rows) {
    const expenseDate = parseDate(row.date);
    if (!expenseDate) continue;

    const memberNames = members.map(m => m.name);
    const splitNames = parseSplitWith(row.split_with);

    // Also check the payer
    const allNames = [...splitNames];
    if (row.paid_by?.trim()) allNames.push(row.paid_by.trim());

    for (const name of allNames) {
      // Resolve the name (exact or fuzzy)
      let resolvedName = name;
      const exact = memberNames.find(m => m.toLowerCase() === name.toLowerCase());
      if (exact) {
        resolvedName = exact;
      } else {
        const fuzzy = fuzzyMatchName(name, memberNames);
        if (fuzzy) resolvedName = fuzzy.match;
        else continue; // Unknown participant, handled by another detector
      }

      const member = memberLookup[resolvedName.toLowerCase()];
      if (!member || !member.left_at) continue;

      const leftAt = new Date(member.left_at);
      if (expenseDate > leftAt) {
        anomalies.push({
          row_number: row._row_number,
          anomaly_type: 'POST_DEPARTURE_EXPENSE',
          severity: 'WARNING',
          description: `${resolvedName} left on ${formatDateISO(leftAt)} but is included in expense dated ${row.date}`,
          original_value: resolvedName,
          suggested_fix: `Remove ${resolvedName} from split, recalculate among remaining members`,
        });
      }
    }
  }

  return anomalies;
}

module.exports = { detect };
