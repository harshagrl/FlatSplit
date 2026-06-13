/**
 * Import Routes — CSV upload, preview, confirm, and history
 * 
 * POST /api/import/preview      — Upload CSV, run pipeline, return preview
 * POST /api/import/confirm/:id  — Apply user decisions and import rows
 * GET  /api/import/runs         — List past import runs
 * GET  /api/import/runs/:id     — Full detail of one import run
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../lib/prisma');
const { runPipeline } = require('../importers/pipeline');
const { parseDate, parseSplitWith, parseSplitDetails, cleanAmount, fuzzyMatchName } = require('../importers/utils');
const authMiddleware = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for CSV uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// All import routes require authentication
router.use(authMiddleware);

// Fixed exchange rate (D006)
const USD_TO_INR = 84;

// ─────────────────────────────────────────────
// POST /api/import/preview
// ─────────────────────────────────────────────
router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw AppError(400, 'NO_FILE', 'No CSV file uploaded');
    }

    // Read CSV content
    const csvText = fs.readFileSync(req.file.path, 'utf-8');

    // Run the import pipeline
    const { rows, anomalies, summary } = await runPipeline(csvText);

    // Create ImportRun record
    const importRun = await prisma.importRun.create({
      data: {
        filename: req.file.originalname,
        uploaded_by_id: req.user.userId,
        total_rows: summary.total,
        flagged_count: summary.needsReview + summary.blocked,
        status: 'REVIEWING',
      },
    });

    // Save anomalies to database
    if (anomalies.length > 0) {
      await prisma.importAnomaly.createMany({
        data: anomalies.map(a => ({
          import_run_id: importRun.id,
          row_number: a.row_number,
          anomaly_type: a.anomaly_type,
          severity: a.severity,
          description: a.description,
          original_value: a.original_value || null,
          suggested_fix: a.suggested_fix || null,
          resolution: a.resolution || 'PENDING',
          auto_resolved: a.auto_resolved || false,
        })),
      });
    }

    // Save processed rows as JSON for the confirm step
    const jsonPath = req.file.path.replace(/\.csv$/i, '') + '.json';
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));

    // Fetch saved anomalies (with IDs) to return
    const savedAnomalies = await prisma.importAnomaly.findMany({
      where: { import_run_id: importRun.id },
      orderBy: { row_number: 'asc' },
    });

    res.status(201).json({
      importRunId: importRun.id,
      rows,
      anomalies: savedAnomalies,
      summary,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/import/confirm/:importRunId
// ─────────────────────────────────────────────
router.post('/confirm/:importRunId', async (req, res, next) => {
  try {
    const { importRunId } = req.params;
    const { decisions = [] } = req.body;
    // decisions: [{ anomalyId, resolution, user_action }]

    // Load the import run
    const importRun = await prisma.importRun.findUnique({
      where: { id: importRunId },
      include: { anomalies: true },
    });

    if (!importRun) {
      throw AppError(404, 'IMPORT_RUN_NOT_FOUND', 'Import run not found');
    }

    if (importRun.status === 'COMPLETED') {
      throw AppError(400, 'ALREADY_COMPLETED', 'This import has already been completed');
    }

    // Apply user decisions to anomalies
    for (const decision of decisions) {
      await prisma.importAnomaly.update({
        where: { id: decision.anomalyId },
        data: {
          resolution: decision.resolution,
          user_action: decision.user_action || null,
          resolved_at: new Date(),
        },
      });
    }

    // Reload anomalies with updated resolutions
    const anomalies = await prisma.importAnomaly.findMany({
      where: { import_run_id: importRunId },
    });

    // Build anomaly lookup: row_number → array of anomalies
    const anomalyByRow = {};
    for (const a of anomalies) {
      if (!anomalyByRow[a.row_number]) anomalyByRow[a.row_number] = [];
      anomalyByRow[a.row_number].push(a);
    }

    // Load the processed rows JSON
    const uploadsFiles = fs.readdirSync(uploadsDir);
    const jsonFile = uploadsFiles.find(f => f.endsWith('.json') && importRun.filename && f.includes(importRun.filename.replace('.csv', '')));
    
    // Fallback: find JSON by looking at the import run creation time
    let rows;
    const possibleJsonFiles = uploadsFiles.filter(f => f.endsWith('.json'));
    for (const f of possibleJsonFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(uploadsDir, f), 'utf-8'));
        if (Array.isArray(content) && content.length === importRun.total_rows) {
          rows = content;
          break;
        }
      } catch (e) { continue; }
    }

    if (!rows) {
      throw AppError(400, 'DATA_NOT_FOUND', 'Processed row data not found. Please re-upload the CSV.');
    }

    // Load members for name resolution
    const members = await prisma.member.findMany();
    const memberByName = {};
    for (const m of members) {
      memberByName[m.name.toLowerCase()] = m;
    }
    const memberNames = members.map(m => m.name);

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const rowAnomalies = anomalyByRow[row._row_number] || [];

      // Check if row is blocked
      const hasBlockingError = rowAnomalies.some(
        a => a.severity === 'ERROR' &&
          a.resolution !== 'USER_APPROVED' &&
          a.resolution !== 'USER_EDITED' &&
          a.resolution !== 'AUTO_APPROVED'
      );

      const isUserRejected = rowAnomalies.some(
        a => a.resolution === 'USER_REJECTED' || a.resolution === 'SKIPPED'
      );

      if (hasBlockingError || isUserRejected) {
        skippedCount++;
        continue;
      }

      // Check if this is a settlement
      const isSettlement = rowAnomalies.some(
        a => a.anomaly_type === 'SETTLEMENT_DETECTED' &&
          (a.resolution === 'USER_APPROVED' || a.resolution === 'AUTO_APPROVED')
      );

      try {
        if (isSettlement) {
          await importSettlement(row, importRunId, memberByName, memberNames);
        } else {
          await importExpense(row, importRunId, memberByName, memberNames);
        }
        importedCount++;
      } catch (err) {
        console.error(`Failed to import row ${row._row_number}:`, err.message);
        skippedCount++;
      }
    }

    // Update import run
    await prisma.importRun.update({
      where: { id: importRunId },
      data: {
        status: 'COMPLETED',
        imported_count: importedCount,
        skipped_count: skippedCount,
        completed_at: new Date(),
      },
    });

    // Final report
    const updatedRun = await prisma.importRun.findUnique({
      where: { id: importRunId },
      include: {
        anomalies: { orderBy: { row_number: 'asc' } },
      },
    });

    res.json({
      importRun: updatedRun,
      report: {
        total: importRun.total_rows,
        imported: importedCount,
        skipped: skippedCount,
        anomalies: anomalies.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Import a single row as an Expense with ExpenseSplits
 */
async function importExpense(row, importRunId, memberByName, memberNames) {
  // Resolve payer
  const payerName = resolveNameToMember(row.paid_by, memberByName, memberNames);
  if (!payerName) throw new Error(`Cannot resolve payer: ${row.paid_by}`);
  const payer = memberByName[payerName.toLowerCase()];

  // Parse fields
  const expenseDate = parseDate(row.date);
  if (!expenseDate) throw new Error(`Invalid date: ${row.date}`);

  const amount = cleanAmount(row.amount);
  if (isNaN(amount) || amount === 0) throw new Error(`Invalid amount: ${row.amount}`);

  const currency = (row.currency?.trim() || 'INR').toUpperCase();
  const exchangeRate = currency === 'USD' ? USD_TO_INR : 1;
  const amountINR = Number((Math.abs(amount) * exchangeRate).toFixed(2));
  const isRefund = row._is_refund || false;

  // Parse split info
  const splitType = normalizeSplitType(row.split_type);
  const splitNames = parseSplitWith(row.split_with);
  const splitDetails = parseSplitDetails(row.split_details);

  // Resolve split participants
  const participants = [];
  for (const name of splitNames) {
    const resolved = resolveNameToMember(name, memberByName, memberNames);
    if (resolved) {
      participants.push(memberByName[resolved.toLowerCase()]);
    }
  }

  if (participants.length === 0) {
    throw new Error(`No valid participants for row ${row._row_number}`);
  }

  // Calculate splits
  const splits = calculateSplits(participants, amountINR, splitType, splitDetails);

  // Extract category from description
  const category = extractCategory(row.description);

  // Create expense with splits
  await prisma.expense.create({
    data: {
      description: row.description?.trim() || 'Untitled expense',
      date: expenseDate,
      original_amount: Math.abs(amount),
      currency,
      exchange_rate: exchangeRate,
      converted_amount_inr: amountINR,
      paid_by_id: payer.id,
      split_type: splitType,
      category,
      notes: row.notes?.trim() || null,
      is_refund: isRefund,
      import_run_id: importRunId,
      csv_row_number: row._row_number,
      splits: {
        create: splits.map(s => ({
          member_id: s.memberId,
          share_value: s.shareValue,
          owed_amount_inr: s.owedAmount,
        })),
      },
    },
  });
}

/**
 * Import a single row as a Settlement
 */
async function importSettlement(row, importRunId, memberByName, memberNames) {
  const fromName = resolveNameToMember(row.paid_by, memberByName, memberNames);
  if (!fromName) throw new Error(`Cannot resolve settlement payer: ${row.paid_by}`);

  const splitNames = parseSplitWith(row.split_with);
  if (splitNames.length === 0) throw new Error('Settlement has no recipient');

  const toName = resolveNameToMember(splitNames[0], memberByName, memberNames);
  if (!toName) throw new Error(`Cannot resolve settlement recipient: ${splitNames[0]}`);

  const settlementDate = parseDate(row.date);
  if (!settlementDate) throw new Error(`Invalid date: ${row.date}`);

  const amount = Math.abs(cleanAmount(row.amount));
  if (isNaN(amount)) throw new Error(`Invalid amount: ${row.amount}`);

  const currency = (row.currency?.trim() || 'INR').toUpperCase();
  const exchangeRate = currency === 'USD' ? USD_TO_INR : 1;
  const amountINR = Number((amount * exchangeRate).toFixed(2));

  await prisma.settlement.create({
    data: {
      date: settlementDate,
      from_member_id: memberByName[fromName.toLowerCase()].id,
      to_member_id: memberByName[toName.toLowerCase()].id,
      amount_inr: amountINR,
      original_amount: currency !== 'INR' ? amount : null,
      currency,
      exchange_rate: exchangeRate,
      notes: row.notes?.trim() || null,
      import_run_id: importRunId,
      csv_row_number: row._row_number,
    },
  });
}

/**
 * Resolve a name string to a known member name (exact or fuzzy)
 */
function resolveNameToMember(name, memberByName, memberNames) {
  if (!name?.trim()) return null;
  const trimmed = name.trim();

  // Exact match (case-insensitive)
  if (memberByName[trimmed.toLowerCase()]) return trimmed;

  // Fuzzy match
  const fuzzy = fuzzyMatchName(trimmed, memberNames);
  return fuzzy ? fuzzy.match : null;
}

/**
 * Normalize split_type string to Prisma enum value
 */
function normalizeSplitType(splitTypeStr) {
  if (!splitTypeStr?.trim()) return 'EQUAL';
  const normalized = splitTypeStr.trim().toUpperCase();
  const valid = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'];
  return valid.includes(normalized) ? normalized : 'EQUAL';
}

/**
 * Calculate split amounts for each participant
 */
function calculateSplits(participants, totalAmountINR, splitType, splitDetails) {
  const splits = [];

  switch (splitType) {
    case 'EQUAL': {
      const perPerson = Number((totalAmountINR / participants.length).toFixed(2));
      // Handle rounding: give remainder to first participant
      let remainder = Number((totalAmountINR - perPerson * participants.length).toFixed(2));
      for (let i = 0; i < participants.length; i++) {
        const amount = i === 0 ? perPerson + remainder : perPerson;
        splits.push({
          memberId: participants[i].id,
          shareValue: null,
          owedAmount: Number(amount.toFixed(2)),
        });
      }
      break;
    }

    case 'PERCENTAGE': {
      for (let i = 0; i < participants.length; i++) {
        const pct = splitDetails[i] || (100 / participants.length);
        const amount = Number(((pct / 100) * totalAmountINR).toFixed(2));
        splits.push({
          memberId: participants[i].id,
          shareValue: pct,
          owedAmount: amount,
        });
      }
      break;
    }

    case 'SHARES': {
      const totalShares = splitDetails.reduce((a, b) => a + b, 0) || participants.length;
      for (let i = 0; i < participants.length; i++) {
        const share = splitDetails[i] || 1;
        const amount = Number(((share / totalShares) * totalAmountINR).toFixed(2));
        splits.push({
          memberId: participants[i].id,
          shareValue: share,
          owedAmount: amount,
        });
      }
      break;
    }

    case 'UNEQUAL': {
      for (let i = 0; i < participants.length; i++) {
        const amount = splitDetails[i] || 0;
        splits.push({
          memberId: participants[i].id,
          shareValue: amount,
          owedAmount: Number(amount.toFixed(2)),
        });
      }
      break;
    }

    default: {
      // Fallback to equal
      const perPerson = Number((totalAmountINR / participants.length).toFixed(2));
      for (const p of participants) {
        splits.push({
          memberId: p.id,
          shareValue: null,
          owedAmount: perPerson,
        });
      }
    }
  }

  return splits;
}

/**
 * Extract a category from the expense description using keyword matching
 */
function extractCategory(description) {
  if (!description) return null;
  const lower = description.toLowerCase();

  const categories = {
    'rent': ['rent', 'lease'],
    'groceries': ['groceries', 'grocery', 'vegetables', 'fruits', 'supermarket', 'dmart', 'bigbasket'],
    'utilities': ['electricity', 'water bill', 'gas bill', 'internet', 'wifi', 'broadband', 'utility'],
    'dining': ['dinner', 'lunch', 'breakfast', 'restaurant', 'cafe', 'pizza', 'biryani', 'food', 'dining', 'takeout'],
    'transport': ['uber', 'ola', 'taxi', 'bus', 'metro', 'fuel', 'petrol', 'auto', 'cab', 'transport'],
    'entertainment': ['movie', 'netflix', 'spotify', 'concert', 'show', 'outing', 'trip', 'excursion'],
    'household': ['cleaning', 'supplies', 'detergent', 'kitchen', 'household', 'furniture', 'repair'],
    'medical': ['medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'health'],
    'shopping': ['shopping', 'clothes', 'amazon', 'flipkart'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }

  return 'other';
}

// ─────────────────────────────────────────────
// GET /api/import/runs
// ─────────────────────────────────────────────
router.get('/runs', async (req, res, next) => {
  try {
    const runs = await prisma.importRun.findMany({
      orderBy: { started_at: 'desc' },
      include: {
        _count: { select: { anomalies: true } },
      },
    });

    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/import/runs/:id
// ─────────────────────────────────────────────
router.get('/runs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const run = await prisma.importRun.findUnique({
      where: { id },
      include: {
        anomalies: { orderBy: { row_number: 'asc' } },
      },
    });

    if (!run) {
      throw AppError(404, 'IMPORT_RUN_NOT_FOUND', 'Import run not found');
    }

    res.json({ run });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
