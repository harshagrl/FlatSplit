const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authMiddleware);

const USD_TO_INR = 84;

const createSettlementSchema = z.object({
  from_member_id: z.string().uuid('Invalid from_member_id'),
  to_member_id: z.string().uuid('Invalid to_member_id'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['INR', 'USD']),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  notes: z.string().optional()
});

// ─────────────────────────────────────────────
// GET /api/settlements
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const settlements = await prisma.settlement.findMany({
      orderBy: { date: 'desc' },
      include: {
        from_member: { select: { id: true, name: true } },
        to_member: { select: { id: true, name: true } }
      }
    });

    res.json({ settlements });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/settlements/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        from_member: { select: { id: true, name: true } },
        to_member: { select: { id: true, name: true } },
        import_run: { select: { id: true, filename: true } }
      }
    });

    if (!settlement) {
      throw AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    }

    res.json({ settlement });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/settlements
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const data = createSettlementSchema.parse(req.body);

    if (data.from_member_id === data.to_member_id) {
      throw AppError(400, 'INVALID_SETTLEMENT', 'Cannot settle with yourself');
    }

    const members = await prisma.member.findMany({
      where: { id: { in: [data.from_member_id, data.to_member_id] } }
    });

    if (members.length !== 2) {
      throw AppError(400, 'INVALID_MEMBERS', 'One or both members are invalid');
    }

    const amountINR = data.currency === 'USD' 
      ? Number((data.amount * USD_TO_INR).toFixed(2)) 
      : Number(data.amount.toFixed(2));

    const settlement = await prisma.settlement.create({
      data: {
        date: new Date(data.date),
        from_member_id: data.from_member_id,
        to_member_id: data.to_member_id,
        amount_inr: amountINR,
        original_amount: data.amount,
        currency: data.currency,
        exchange_rate: data.currency === 'USD' ? USD_TO_INR : 1,
        notes: data.notes || null,
      },
      include: {
        from_member: { select: { id: true, name: true } },
        to_member: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ settlement });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
