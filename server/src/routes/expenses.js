const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authMiddleware);

// Fixed exchange rate for USD
const USD_TO_INR = 84;

// Validation schema for creating an expense
const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['INR', 'USD']),
  paid_by_id: z.string().uuid('Invalid payer ID'),
  split_type: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES']),
  notes: z.string().optional(),
  splits: z.array(z.object({
    member_id: z.string().uuid(),
    value: z.number().nullable().optional() // share, percentage, or exact amount
  })).min(1, 'At least one participant is required')
});

// ─────────────────────────────────────────────
// GET /api/expenses
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { month, member_id, split_type } = req.query;

    const where = {};

    if (month) {
      // month is expected to be YYYY-MM
      const [year, m] = month.split('-');
      const startOfMonth = new Date(year, m - 1, 1);
      const endOfMonth = new Date(year, m, 0); // last day of month
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    if (member_id) {
      // Find expenses where the member either paid or is involved in the split
      where.OR = [
        { paid_by_id: member_id },
        { splits: { some: { member_id: member_id } } }
      ];
    }

    if (split_type) {
      where.split_type = split_type;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        paid_by: { select: { id: true, name: true } },
        splits: {
          include: {
            member: { select: { name: true } }
          }
        }
      }
    });

    res.json({ expenses });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/expenses/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        paid_by: { select: { id: true, name: true } },
        splits: {
          include: {
            member: { select: { name: true, is_active: true } }
          }
        },
        import_run: { select: { id: true, filename: true } }
      }
    });

    if (!expense) {
      throw AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    }

    res.json({ expense });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/expenses
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    const expenseDate = new Date(data.date);
    const amountINR = data.currency === 'USD' 
      ? Number((data.amount * USD_TO_INR).toFixed(2)) 
      : Number(data.amount.toFixed(2));

    // Get all involved members to validate they were active on this date
    const memberIds = new Set(data.splits.map(s => s.member_id));
    memberIds.add(data.paid_by_id);

    const members = await prisma.member.findMany({
      where: { id: { in: Array.from(memberIds) } }
    });

    if (members.length !== memberIds.size) {
      throw AppError(400, 'INVALID_MEMBERS', 'One or more members are invalid');
    }

    for (const member of members) {
      const joinedAt = new Date(member.joined_at);
      // Strip time portions for fair date comparison
      const expDateStr = expenseDate.toISOString().split('T')[0];
      const joinDateStr = joinedAt.toISOString().split('T')[0];

      if (expDateStr < joinDateStr) {
        throw AppError(400, 'PRE_JOIN_EXPENSE', `Member ${member.name} had not joined yet on ${expDateStr}`);
      }

      if (member.left_at) {
        const leftAtStr = new Date(member.left_at).toISOString().split('T')[0];
        if (expDateStr > leftAtStr) {
          throw AppError(400, 'POST_DEPARTURE_EXPENSE', `Member ${member.name} had already left before ${expDateStr}`);
        }
      }
    }

    // Calculate and validate splits
    const finalSplits = [];
    
    if (data.split_type === 'EQUAL') {
      const numParticipants = data.splits.length;
      const perPerson = Number((amountINR / numParticipants).toFixed(2));
      let remainder = Number((amountINR - (perPerson * numParticipants)).toFixed(2));

      for (let i = 0; i < data.splits.length; i++) {
        const amount = i === 0 ? perPerson + remainder : perPerson;
        finalSplits.push({
          member_id: data.splits[i].member_id,
          share_value: null,
          owed_amount_inr: Number(amount.toFixed(2))
        });
      }
    } 
    else if (data.split_type === 'UNEQUAL') {
      let sum = 0;
      for (const s of data.splits) {
        if (s.value == null || s.value < 0) throw AppError(400, 'INVALID_SPLIT', 'Exact amounts must be provided and >= 0');
        // If it's USD, the unequal amounts provided by user might be in USD. We need them in INR.
        const owedINR = data.currency === 'USD' ? Number((s.value * USD_TO_INR).toFixed(2)) : Number(s.value.toFixed(2));
        sum += owedINR;
        finalSplits.push({
          member_id: s.member_id,
          share_value: Number(s.value.toFixed(2)), // Original currency amount
          owed_amount_inr: owedINR
        });
      }
      
      // Allow a tiny rounding tolerance (e.g., 0.05) if currency conversion creates small drifts
      if (Math.abs(sum - amountINR) > 0.05) {
        throw AppError(400, 'INVALID_SPLIT', `Unequal amounts sum (${sum}) does not match total amount (${amountINR})`);
      }
    } 
    else if (data.split_type === 'PERCENTAGE') {
      let sumPct = 0;
      for (const s of data.splits) {
        if (s.value == null || s.value < 0) throw AppError(400, 'INVALID_SPLIT', 'Percentages must be provided and >= 0');
        sumPct += s.value;
        const owedINR = Number(((s.value / 100) * amountINR).toFixed(2));
        finalSplits.push({
          member_id: s.member_id,
          share_value: Number(s.value.toFixed(4)),
          owed_amount_inr: owedINR
        });
      }
      if (Math.abs(sumPct - 100) > 0.01) {
        throw AppError(400, 'INVALID_SPLIT', `Percentages must sum to 100, got ${sumPct}`);
      }
    } 
    else if (data.split_type === 'SHARES') {
      let totalShares = 0;
      for (const s of data.splits) {
        if (s.value == null || s.value <= 0) throw AppError(400, 'INVALID_SPLIT', 'Shares must be provided and > 0');
        totalShares += s.value;
      }
      
      let sumINR = 0;
      for (let i = 0; i < data.splits.length; i++) {
        const s = data.splits[i];
        let owedINR = Number(((s.value / totalShares) * amountINR).toFixed(2));
        
        // Handle remainder on the first person
        if (i === data.splits.length - 1) {
           owedINR = Number((amountINR - sumINR).toFixed(2));
        } else {
           sumINR += owedINR;
        }

        finalSplits.push({
          member_id: s.member_id,
          share_value: Number(s.value.toFixed(4)),
          owed_amount_inr: owedINR
        });
      }
    }

    // Create Expense in a transaction
    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        date: expenseDate,
        original_amount: data.amount,
        currency: data.currency,
        exchange_rate: data.currency === 'USD' ? USD_TO_INR : 1,
        converted_amount_inr: amountINR,
        paid_by_id: data.paid_by_id,
        split_type: data.split_type,
        notes: data.notes || null,
        splits: {
          create: finalSplits
        }
      },
      include: {
        paid_by: { select: { name: true } },
        splits: { include: { member: { select: { name: true } } } }
      }
    });

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// DELETE /api/expenses/:id
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify existence
    const expense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!expense) {
      throw AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    }

    // Delete (Prisma onDelete: Cascade will handle splits automatically)
    await prisma.expense.delete({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
