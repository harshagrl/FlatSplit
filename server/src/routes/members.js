/**
 * Members routes — Manage flatmates and guests
 * 
 * GET /api/members/available — List members without accounts
 * GET /api/members           — List all members with status
 * GET /api/members/:id       — Member detail and basic stats
 */

const express = require('express');
const { prisma } = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/members/available (Public/Unauthenticated — used by RegisterPage)
router.get('/available', async (req, res, next) => {
  try {
    const members = await prisma.member.findMany({
      where: {
        user: null, // No user account linked
        is_active: true, // Only allow active members to register
      },
      orderBy: { name: 'asc' },
    });
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// Protect all other member routes
router.use(authMiddleware);

// GET /api/members
router.get('/', async (req, res, next) => {
  try {
    const members = await prisma.member.findMany({
      include: {
        user: { select: { id: true } },
      },
      orderBy: { joined_at: 'asc' },
    });

    const formatted = members.map(m => ({
      ...m,
      has_account: !!m.user,
      user: undefined, // Don't leak the user relation details
    }));

    res.json({ members: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } },
        expenses_paid: {
          select: { id: true, converted_amount_inr: true },
        },
        splits: {
          select: { id: true, owed_amount_inr: true },
        },
        settlements_sent: {
          select: { id: true, amount_inr: true },
        },
        settlements_received: {
          select: { id: true, amount_inr: true },
        },
      },
    });

    if (!member) {
      throw AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    }

    const total_paid = member.expenses_paid.reduce((sum, e) => sum + Number(e.converted_amount_inr), 0);
    const total_owed = member.splits.reduce((sum, s) => sum + Number(s.owed_amount_inr), 0);
    const total_settled_sent = member.settlements_sent.reduce((sum, s) => sum + Number(s.amount_inr), 0);
    const total_settled_received = member.settlements_received.reduce((sum, s) => sum + Number(s.amount_inr), 0);
    const net_balance = total_paid - total_owed + total_settled_sent - total_settled_received;

    res.json({
      member: {
        id: member.id,
        name: member.name,
        joined_at: member.joined_at,
        left_at: member.left_at,
        is_active: member.is_active,
        notes: member.notes,
        has_account: !!member.user,
        stats: {
          total_paid,
          total_owed,
          total_settled_sent,
          total_settled_received,
          net_balance,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
