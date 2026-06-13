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
  console.log('Pipeline started, csv length:', csvText.length);
  
  try {
    // Step 1: Parse CSV
    console.log('Pipeline Step 1: parsing CSV...');
    const { rows } = parseCSV(csvText);
    console.log('Pipeline Step 1 done:', rows.length, 'rows parsed');

    // Step 2: Load member data from database (needed by several detectors)
    console.log('Pipeline Step 2: loading members...');
    const members = await prisma.member.findMany();
    console.log('Pipeline Step 2 done:', members.length, 'members loaded');

    // Step 3: Run all detectors
    console.log('Pipeline Step 3: running detectors...');
    const rawAnomalies = runAllDetectors(rows, members);
    console.log('Pipeline Step 3 done:', rawAnomalies.length, 'raw anomalies');

    // Step 4: Auto-resolve INFO anomalies
    console.log('Pipeline Step 4: auto-resolving...');
    const { resolvedRows, resolvedAnomalies } = autoResolve(rows, rawAnomalies);
    console.log('Pipeline Step 4 done:', resolvedAnomalies.length, 'resolved anomalies');

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

    console.log('Pipeline complete. Summary:', JSON.stringify(summary));

    return {
      rows: resolvedRows,
      anomalies: resolvedAnomalies,
      summary,
      members,
    };
  } catch (err) {
    console.error('PIPELINE ERROR:', err.message);
    console.error(err.stack);
    throw err;
  }
}

module.exports = { runPipeline };
