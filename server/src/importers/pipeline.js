/**
 * Import Pipeline
 * 
 * Orchestrates the full CSV import flow:
 *   Step 1: Parse CSV with parser.js
 *   Step 2: Run all detectors
 *   Step 3: Auto-resolve INFO anomalies
 *   Step 4: Return { rows, anomalies, summary }
 */

const { parseCSV } = require('./parser');
const { runAllDetectors } = require('./detectors');
const { autoResolve } = require('./resolvers/autoResolver');
const { prisma } = require('../lib/prisma');

/**
 * Run the full import pipeline on raw CSV text.
 * 
 * @param {string} csvText - Raw CSV content
 * @returns {Promise<{ rows, anomalies, summary }>}
 */
async function runPipeline(csvText) {
  // Step 1: Parse CSV
  const { rows } = parseCSV(csvText);

  // Step 2: Load member data from database (needed by several detectors)
  const members = await prisma.member.findMany();

  // Step 3: Run all detectors
  const rawAnomalies = runAllDetectors(rows, members);

  // Step 4: Auto-resolve INFO anomalies
  const { resolvedRows, resolvedAnomalies } = autoResolve(rows, rawAnomalies);

  // Step 5: Build summary
  const autoResolved = resolvedAnomalies.filter(
    a => a.resolution === 'AUTO_APPROVED'
  ).length;

  const needsReview = resolvedAnomalies.filter(
    a => a.severity === 'WARNING' && a.resolution !== 'AUTO_APPROVED'
  ).length;

  const blocked = resolvedAnomalies.filter(
    a => a.severity === 'ERROR' && a.resolution !== 'AUTO_APPROVED'
  ).length;

  const summary = {
    total: rows.length,
    autoResolved,
    needsReview,
    blocked,
    clean: rows.length - new Set(resolvedAnomalies.map(a => a.row_number)).size,
  };

  return {
    rows: resolvedRows,
    anomalies: resolvedAnomalies,
    summary,
    members,
  };
}

module.exports = { runPipeline };
