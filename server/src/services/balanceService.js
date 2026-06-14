const { prisma } = require('../lib/prisma');

/**
 * Calculate net balances for all members.
 * Returns a Map of member_id -> net_balance
 * Positive balance = They are owed money (Creditor)
 * Negative balance = They owe money (Debtor)
 */
async function calculateMemberBalances() {
  const members = await prisma.member.findMany();
  
  const balances = new Map();
  for (const m of members) {
    balances.set(m.id, 0);
  }

  // 1. Add amount they paid for expenses (they are owed this money back)
  const expensesPaid = await prisma.expense.groupBy({
    by: ['paid_by_id'],
    _sum: { converted_amount_inr: true }
  });

  for (const ep of expensesPaid) {
    if (balances.has(ep.paid_by_id) && ep._sum.converted_amount_inr) {
      balances.set(ep.paid_by_id, balances.get(ep.paid_by_id) + Number(ep._sum.converted_amount_inr));
    }
  }

  // 2. Subtract amount they owe from their splits (they owe this money to the payer)
  const splitsOwed = await prisma.expenseSplit.groupBy({
    by: ['member_id'],
    _sum: { owed_amount_inr: true }
  });

  for (const so of splitsOwed) {
    if (balances.has(so.member_id) && so._sum.owed_amount_inr) {
      balances.set(so.member_id, balances.get(so.member_id) - Number(so._sum.owed_amount_inr));
    }
  }

  // 3. Add settlements they sent (they paid off their debt, so their balance goes up)
  const settlementsSent = await prisma.settlement.groupBy({
    by: ['from_member_id'],
    _sum: { amount_inr: true }
  });

  for (const ss of settlementsSent) {
    if (balances.has(ss.from_member_id) && ss._sum.amount_inr) {
      balances.set(ss.from_member_id, balances.get(ss.from_member_id) + Number(ss._sum.amount_inr));
    }
  }

  // 4. Subtract settlements they received (they got their money back, so their balance goes down)
  const settlementsReceived = await prisma.settlement.groupBy({
    by: ['to_member_id'],
    _sum: { amount_inr: true }
  });

  for (const sr of settlementsReceived) {
    if (balances.has(sr.to_member_id) && sr._sum.amount_inr) {
      balances.set(sr.to_member_id, balances.get(sr.to_member_id) - Number(sr._sum.amount_inr));
    }
  }

  // Round all balances to 2 decimal places to avoid floating point drift
  const finalBalances = new Map();
  for (const [id, amount] of balances.entries()) {
    finalBalances.set(id, Number(amount.toFixed(2)));
  }

  return finalBalances;
}

/**
 * Greedy Debt Simplification Algorithm
 * Matches the largest debtor with the largest creditor iteratively.
 */
function simplifyDebts(balancesMap, membersMap) {
  const creditors = [];
  const debtors = [];

  for (const [id, amount] of balancesMap.entries()) {
    if (amount > 0.01) {
      creditors.push({ id, amount });
    } else if (amount < -0.01) {
      debtors.push({ id, amount: Math.abs(amount) });
    }
  }

  // Sort descending by magnitude (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0; // creditors index
  let j = 0; // debtors index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.amount, debtor.amount);
    
    const fromMember = membersMap.get(debtor.id);
    const toMember = membersMap.get(creditor.id);

    transactions.push({
      from_member_id: debtor.id,
      from_member_name: fromMember ? fromMember.name : 'Unknown',
      to_member_id: creditor.id,
      to_member_name: toMember ? toMember.name : 'Unknown',
      amount: Number(amount.toFixed(2))
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    // Move to next if fully settled
    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transactions;
}

module.exports = {
  calculateMemberBalances,
  simplifyDebts
};
