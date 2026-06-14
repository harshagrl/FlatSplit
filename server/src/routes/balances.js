const express = require('express');
const { prisma } = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { calculateMemberBalances, simplifyDebts } = require('../services/balanceService');

const router = express.Router();

router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/balances/summary
// ─────────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const balances = await calculateMemberBalances();
    
    const members = await prisma.member.findMany();
    const membersMap = new Map(members.map(m => [m.id, m]));
    
    // Calculate the simplified debts using the greedy algorithm
    const simplifiedDebts = simplifyDebts(balances, membersMap);
    
    // Also return the raw net balances for the dashboard
    const memberBalances = Array.from(balances.entries()).map(([id, amount]) => ({
      member_id: id,
      member_name: membersMap.get(id) ? membersMap.get(id).name : 'Unknown',
      net_balance: amount
    }));

    res.json({
      memberBalances,
      simplifiedDebts
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/balances/member/:id
// ─────────────────────────────────────────────
router.get('/member/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verify member
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');

    // Fetch all expenses paid by them OR where they are in the split
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { paid_by_id: id },
          { splits: { some: { member_id: id } } }
        ]
      },
      include: {
        paid_by: { select: { name: true } },
        splits: { where: { member_id: id } } // only include their split portion
      }
    });

    // Fetch all settlements involving them
    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [
          { from_member_id: id },
          { to_member_id: id }
        ]
      },
      include: {
        from_member: { select: { name: true } },
        to_member: { select: { name: true } }
      }
    });

    // Combine into a chronological ledger
    const ledger = [];

    for (const exp of expenses) {
      const mySplit = exp.splits[0]; // will exist if I am in the split
      const paidByMe = exp.paid_by_id === id;
      
      let impact = 0;
      
      if (paidByMe) {
        // If I paid, the full expense amount goes to my positive balance
        impact += Number(exp.converted_amount_inr);
      }
      
      if (mySplit) {
        // If I am in the split, my owed share goes to my negative balance
        impact -= Number(mySplit.owed_amount_inr);
      }

      if (impact !== 0) {
        ledger.push({
          type: 'EXPENSE',
          date: exp.date,
          id: exp.id,
          description: exp.description,
          impact: Number(impact.toFixed(2)),
          details: {
            paid_by: exp.paid_by.name,
            total_amount: Number(exp.converted_amount_inr),
            my_share: mySplit ? Number(mySplit.owed_amount_inr) : 0
          }
        });
      }
    }

    for (const st of settlements) {
      let impact = 0;
      let description = '';
      
      if (st.from_member_id === id) {
        // I sent money -> my balance increases (I owe less)
        impact += Number(st.amount_inr);
        description = `Settlement sent to ${st.to_member.name}`;
      } else {
        // I received money -> my balance decreases (They owe me less)
        impact -= Number(st.amount_inr);
        description = `Settlement received from ${st.from_member.name}`;
      }
      
      ledger.push({
        type: 'SETTLEMENT',
        date: st.date,
        id: st.id,
        description,
        impact: Number(impact.toFixed(2)),
        details: {
          from: st.from_member.name,
          to: st.to_member.name,
          amount: Number(st.amount_inr)
        }
      });
    }

    // Sort chronologically
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running total
    let runningTotal = 0;
    for (const entry of ledger) {
      runningTotal += entry.impact;
      entry.running_balance = Number(runningTotal.toFixed(2));
    }

    // Calculate overall balance directly via service to ensure it exactly matches
    const balances = await calculateMemberBalances();
    const finalBalance = balances.get(id) || 0;

    res.json({ 
      member_id: id,
      member_name: member.name,
      current_balance: finalBalance,
      ledger 
    });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/balances/monthly?month=YYYY-MM
// ─────────────────────────────────────────────
router.get('/monthly', async (req, res, next) => {
  try {
    const { month } = req.query; // e.g. 2026-03
    if (!month) throw AppError(400, 'MISSING_MONTH', 'Month parameter is required');

    const [year, m] = month.split('-');
    const startOfMonth = new Date(year, m - 1, 1);
    const endOfMonth = new Date(year, m, 0); // last day

    const expenses = await prisma.expense.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { converted_amount_inr: true },
      _count: true
    });

    const settlements = await prisma.settlement.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount_inr: true },
      _count: true
    });

    res.json({
      month,
      total_expenses: Number(expenses._sum.converted_amount_inr || 0),
      expense_count: expenses._count,
      total_settlements: Number(settlements._sum.amount_inr || 0),
      settlement_count: settlements._count
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
