# Architectural & Design Decisions

This document outlines the major technical and product decisions made during the development of FlatSplit.

## Decision: Currency conversion approach
**Options considered:** 
1. Real-time dynamic fetch from a live exchange rate API (e.g., ExchangeRate-API).
2. Fixed, static conversion rate applied at the time of creation.
**What we chose:** Fixed conversion rate (USD * 84).
**Why:** To maintain absolute ledger stability. If historical expenses were evaluated against a live, fluctuating exchange rate, the users' net balances would constantly change every day, making debt settlement mathematically impossible to pin down. Locking the rate at the time of the expense guarantees balance permanence.

## Decision: Membership date enforcement
**Options considered:** 
1. Lenient validation (allow anyone to be split on any date).
2. Strict chronological enforcement based on `joined_at` and `left_at`.
**What we chose:** Strict chronological enforcement with `<` comparison.
**Why:** It prevents severe logical flaws, such as charging members for flat expenses that occurred months before they moved in. We modified the check to `expense_date < member.joined_at` rather than `<=` to ensure members who joined on the exact day of an expense are rightly included.

## Decision: Balance calculation 
**Options considered:** 
1. Stored balances (a `net_balance` column that updates via database triggers or transaction logic upon every expense).
2. On-the-fly aggregation (calculating sum of expenses vs sum of owed splits on request).
**What we chose:** On-the-fly aggregation via `balanceService.js`.
**Why:** Stored balances are highly susceptible to race conditions and "drift" if a database transaction fails midway. Calculating the ledger dynamically ensures 100% mathematical accuracy at all times, relying on Prisma's powerful aggregation capabilities.

## Decision: Settlement as a separate table vs special expense type
**Options considered:** 
1. Treat settlements as an Expense with `is_settlement = true`.
2. Dedicated `Settlement` table.
**What we chose:** Dedicated `Settlement` table.
**Why:** Settlements represent point-to-point transfers (Member A -> Member B), whereas Expenses represent 1-to-Many distributions (Member A -> Members A, B, C). A separate table enforces strict point-to-point relational integrity without overloading the Expense model with nullable fields.

## Decision: CSV import flow
**Options considered:** 
1. Silent automatic import (parse and dump straight to DB).
2. Review-first preview pipeline.
**What we chose:** Review-first preview pipeline with an Anomaly UI.
**Why:** CSVs are notoriously dirty. A silent import would pollute the database with bad data. The review-first pipeline allows the server to parse, detect anomalies, auto-resolve typos, and present a JSON payload back to the user for confirmation *before* a single row touches the permanent ledger.

## Decision: Debt simplification algorithm choice
**Options considered:** 
1. Basic 1-to-1 ledger (A owes B, B owes C).
2. Greedy simplification algorithm (Graph traversal to settle max debts first).
**What we chose:** Greedy simplification algorithm.
**Why:** Without simplification, a flat of 5 people would generate chaotic cyclical debts (A owes B, B owes C, C owes A). The greedy algorithm computes the global net balance for each member, separates "debtors" from "creditors", and matches the largest debtor to the largest creditor, minimizing the total number of physical bank transfers required.

## Decision: Auth approach
**Options considered:** 
1. External Identity Provider (Supabase Auth / Firebase).
2. Custom JWT with bcrypt.
**What we chose:** Custom JWT with bcrypt.
**Why:** For a focused, isolated application, a custom JWT solution drastically minimizes external dependencies and network latency. It allows us to directly inject the `member_id` into the JWT payload, making authorization checks (e.g., "Are you the payer of this expense?") instantly verifiable without database lookups.

## Decision: How to handle the "Rohan paid Aisha back" row
**Options considered:** 
1. Import it as an expense where only Rohan pays and Aisha splits.
2. Flag as SETTLEMENT_DETECTED, import as Settlement record.
**What we chose:** Flag as `SETTLEMENT_DETECTED`, import as Settlement record.
**Why:** The CSV represents shared expenses, but users often mix settlements into them. Instead of skipping it completely, the pipeline detects the SETTLEMENT_DETECTED anomaly and allows the user to approve importing it as a Settlement rather than an Expense. It now correctly appears in the Settlements table without polluting the expenses logic.

## Decision: How to handle conflicting duplicates (Thalassa dinner)
**Options considered:** 
1. Import both and let the user delete the wrong one later.
2. Flag identical amounts and participants within 24 hours as a duplicate.
**What we chose:** Flag identical transactions within 24 hours, deduping the secondary row.
**Why:** Duplicate rows are the #1 cause of inflated flat balances. The pipeline actively protects the user by flagging the conflict, preventing silent ledger corruption.

## Decision: No automated tests tradeoff
**Options considered:** 
1. Implement Jest/Supertest coverage for all endpoints.
2. Rely strictly on manual e2e testing and rigorous schema validation via Zod + Prisma.
**What we chose:** No automated tests tradeoff.
**Why:** To maximize velocity for the 48-hour build timeframe, we traded automated tests for extremely strict runtime validation. By defining robust Zod schemas for all inbound data and leveraging Prisma's type-safety, we eliminated the most common classes of bugs without the overhead of maintaining test suites.
