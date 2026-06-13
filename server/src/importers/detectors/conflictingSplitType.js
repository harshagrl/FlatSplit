/**
 * Detector: CONFLICTING_SPLIT_TYPE
 * 
 * Find rows where split_type = "equal" but split_details has values.
 * Severity: INFO (auto-fix: trust split_details, use SHARES type)
 */

const { parseSplitDetails } = require('../utils');

function detect(rows, _members) {
  const anomalies = [];

  for (const row of rows) {
    const splitType = row.split_type?.trim().toLowerCase();
    if (splitType !== 'equal') continue;

    const details = parseSplitDetails(row.split_details);
    if (details.length === 0) continue;

    // split_type says "equal" but split_details has specific values
    anomalies.push({
      row_number: row._row_number,
      anomaly_type: 'CONFLICTING_SPLIT_TYPE',
      severity: 'INFO',
      description: `Split type is "equal" but split_details has values: ${details.join(', ')}. Treating as SHARES split based on provided values.`,
      original_value: `split_type: ${row.split_type}, split_details: ${row.split_details}`,
      suggested_fix: 'SHARES',
    });
  }

  return anomalies;
}

module.exports = { detect };
