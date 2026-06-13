/**
 * Detector Orchestrator
 * 
 * Runs all anomaly detectors against the parsed CSV rows.
 * Each detector receives (rows, members) and returns an array of anomalies.
 * Returns a flat, deduplicated array of all anomalies sorted by row_number.
 */

// Import all detectors
const exactDuplicate = require('./exactDuplicate');
const formatError = require('./formatError');
const invalidPrecision = require('./invalidPrecision');
const nameMismatch = require('./nameMismatch');
const missingPayer = require('./missingPayer');
const settlementDetected = require('./settlementDetected');
const percentageSumError = require('./percentageSumError');
const unknownParticipant = require('./unknownParticipant');
const conflictingDuplicate = require('./conflictingDuplicate');
const negativeAmount = require('./negativeAmount');
const invalidDateFormat = require('./invalidDateFormat');
const missingCurrency = require('./missingCurrency');
const zeroAmount = require('./zeroAmount');
const ambiguousDate = require('./ambiguousDate');
const postDepartureExpense = require('./postDepartureExpense');
const conflictingSplitType = require('./conflictingSplitType');
const missingSplitType = require('./missingSplitType');
const emptySplitWith = require('./emptySplitWith');
const preJoinExpense = require('./preJoinExpense');

// Ordered list — run format/structure checks first, then semantic checks
const DETECTORS = [
  // Phase 1: Format & structure issues
  { name: 'invalidDateFormat', module: invalidDateFormat },
  { name: 'formatError', module: formatError },
  { name: 'invalidPrecision', module: invalidPrecision },
  { name: 'missingPayer', module: missingPayer },
  { name: 'missingCurrency', module: missingCurrency },
  { name: 'missingSplitType', module: missingSplitType },
  { name: 'emptySplitWith', module: emptySplitWith },

  // Phase 2: Value validation
  { name: 'negativeAmount', module: negativeAmount },
  { name: 'zeroAmount', module: zeroAmount },
  { name: 'percentageSumError', module: percentageSumError },
  { name: 'conflictingSplitType', module: conflictingSplitType },

  // Phase 3: Name resolution
  { name: 'nameMismatch', module: nameMismatch },
  { name: 'unknownParticipant', module: unknownParticipant },

  // Phase 4: Membership timeline
  { name: 'postDepartureExpense', module: postDepartureExpense },
  { name: 'preJoinExpense', module: preJoinExpense },

  // Phase 5: Date ambiguity
  { name: 'ambiguousDate', module: ambiguousDate },

  // Phase 6: Duplicate detection
  { name: 'exactDuplicate', module: exactDuplicate },
  { name: 'conflictingDuplicate', module: conflictingDuplicate },

  // Phase 7: Record type detection
  { name: 'settlementDetected', module: settlementDetected },
];

/**
 * Run all detectors against parsed rows.
 * 
 * @param {object[]} rows - Parsed CSV rows with _row_number
 * @param {object[]} members - Member records from database
 * @returns {object[]} Array of anomaly objects, sorted by row_number
 */
function runAllDetectors(rows, members) {
  const allAnomalies = [];

  for (const { name, module: detector } of DETECTORS) {
    try {
      const anomalies = detector.detect(rows, members);
      allAnomalies.push(...anomalies);
    } catch (err) {
      console.error(`Detector "${name}" failed:`, err.message);
      // Don't let one broken detector kill the whole pipeline
    }
  }

  // Sort by row_number for consistent output
  allAnomalies.sort((a, b) => a.row_number - b.row_number);

  return allAnomalies;
}

module.exports = { runAllDetectors, DETECTORS };
