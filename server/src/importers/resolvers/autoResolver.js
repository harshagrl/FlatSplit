/**
 * Auto-Resolver
 * 
 * Applies auto-fixes for INFO severity anomalies.
 * Returns cleaned row data and updated anomalies with resolution = AUTO_APPROVED.
 * Does NOT modify ERROR or WARNING rows (those need user action).
 */

const { cleanAmount, parseSplitWith } = require('../utils');

/**
 * Apply auto-fixes to rows based on INFO anomalies.
 * 
 * @param {object[]} rows - Parsed CSV rows (will be cloned, not mutated)
 * @param {object[]} anomalies - Detected anomalies
 * @returns {{ resolvedRows: object[], resolvedAnomalies: object[] }}
 */
function autoResolve(rows, anomalies) {
  // Deep clone rows so we don't mutate originals
  const resolvedRows = rows.map(row => ({ ...row }));
  const resolvedAnomalies = anomalies.map(a => ({ ...a }));

  // Build a lookup: row_number → row index
  const rowIndex = {};
  for (let i = 0; i < resolvedRows.length; i++) {
    rowIndex[resolvedRows[i]._row_number] = i;
  }

  for (const anomaly of resolvedAnomalies) {
    // Only auto-resolve INFO severity with a suggested_fix
    if (anomaly.severity !== 'INFO') continue;
    if (!anomaly.suggested_fix) continue;

    const idx = rowIndex[anomaly.row_number];
    if (idx === undefined) continue;

    const row = resolvedRows[idx];

    switch (anomaly.anomaly_type) {
      case 'FORMAT_ERROR':
        // Remove commas from amount
        row.amount = anomaly.suggested_fix;
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'INVALID_PRECISION':
        // Round to 2 decimal places
        row.amount = anomaly.suggested_fix;
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'NAME_MISMATCH':
        // Fix the name in paid_by or split_with
        if (row.paid_by?.trim().toLowerCase() === anomaly.original_value?.toLowerCase()) {
          row.paid_by = anomaly.suggested_fix;
        }
        // Fix in split_with
        if (row.split_with) {
          const names = parseSplitWith(row.split_with);
          const fixedNames = names.map(n =>
            n.toLowerCase() === anomaly.original_value?.toLowerCase()
              ? anomaly.suggested_fix
              : n
          );
          row.split_with = fixedNames.join(', ');
        }
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'INVALID_DATE_FORMAT':
        // Replace with parsed date
        row.date = anomaly.suggested_fix;
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'MISSING_CURRENCY':
        // Default to INR
        row.currency = anomaly.suggested_fix;
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'NEGATIVE_AMOUNT':
        // Mark as refund
        row._is_refund = true;
        row.amount = String(Math.abs(cleanAmount(row.amount)));
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      case 'CONFLICTING_SPLIT_TYPE':
        // Trust split_details, use SHARES
        row.split_type = anomaly.suggested_fix;
        anomaly.resolution = 'AUTO_APPROVED';
        anomaly.auto_resolved = true;
        break;

      default:
        // Unknown INFO type — leave as PENDING
        break;
    }
  }

  return { resolvedRows, resolvedAnomalies };
}

module.exports = { autoResolve };
