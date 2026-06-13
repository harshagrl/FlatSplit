/**
 * Detector: PRE_JOIN_EXPENSE
 * 
 * Check if any member in split_with has a joined_at date
 * that is after the expense date (member hadn't joined yet).
 * Severity: WARNING
 */

const { parseDate, parseSplitWith, formatDateISO, fuzzyMatchName } = require('../utils');

function detect(rows, members) {
  const anomalies = [];

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
      let resolvedName = name;
      const exact = memberNames.find(m => m.toLowerCase() === name.toLowerCase());
      if (exact) {
        resolvedName = exact;
      } else {
        const fuzzy = fuzzyMatchName(name, memberNames);
        if (fuzzy) resolvedName = fuzzy.match;
        else continue;
      }

      const member = memberLookup[resolvedName.toLowerCase()];
      if (!member) continue;

      const joinedAt = new Date(member.joined_at);
      if (expenseDate < joinedAt) {
        anomalies.push({
          row_number: row._row_number,
          anomaly_type: 'PRE_JOIN_EXPENSE',
          severity: 'WARNING',
          description: `${resolvedName} joined on ${formatDateISO(joinedAt)} but is included in expense dated ${row.date} (before they joined)`,
          original_value: resolvedName,
          suggested_fix: `Remove ${resolvedName} from split, recalculate among remaining members`,
        });
      }
    }
  }

  return anomalies;
}

module.exports = { detect };
