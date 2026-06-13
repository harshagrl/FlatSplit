/**
 * Detector: PERCENTAGE_SUM_ERROR
 * 
 * For rows with split_type = percentage, verify that split_details sums to 100%.
 * Allow 0.01 tolerance for floating point.
 * Severity: ERROR (blocks import)
 */

const { parseSplitDetails } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const splitType = row.split_type?.trim().toLowerCase();
    if (splitType !== 'percentage') continue;

    const details = parseSplitDetails(row.split_details);
    if (details.length === 0) continue;

    const sum = details.reduce((a, b) => a + b, 0);
    const tolerance = 0.01;

    if (Math.abs(sum - 100) > tolerance) {
      anomalies.push({
        row_number: row._row_number,
        anomaly_type: 'PERCENTAGE_SUM_ERROR',
        severity: 'ERROR',
        description: `Percentages sum to ${sum.toFixed(2)}%, expected 100%. Values: ${details.join(', ')}`,
        original_value: row.split_details,
        suggested_fix: null,
      });
    }
  }

  return anomalies;
}

module.exports = { detect };
