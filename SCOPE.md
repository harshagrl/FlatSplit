# Project Scope — FlatSplit

## Overview
A shared expenses app for flatmates who tracked expenses in a messy spreadsheet. The core challenge is building a CSV importer that detects data problems, surfaces them to the user, and handles them according to documented policy.

## Users
- **Active flatmates** (can register & login): Aisha, Rohan, Priya, Sam
- **Historical members** (data imported, no login): Meera (departed), Dev (guest)

## Core Features

### 1. CSV Import Engine (Primary Feature)
- Upload CSV file with expense data
- Detect all 16 anomaly types (see below)
- Present anomalies on a single review screen with inline actions
- Auto-resolve INFO-level anomalies (shown for transparency)
- Require user action on WARNING/ERROR anomalies
- Generate and save full import report after every import
- Never silently fix or skip a data problem

### 2. Expense Management
- View all expenses (filterable by month, member, split type, category)
- Add individual expenses manually
- Support 4 split types: equal, unequal, percentage, shares
- Multi-currency support (INR + USD at fixed rate 1 USD = 84 INR)
- Store: original_amount, currency, exchange_rate, converted_amount_inr

### 3. Settlements
- Record settlements between members
- View settlement history
- Settlements reduce balances directly (payer → payee, no split)

### 4. Balance Calculation
- Simplified/minimized debts (fewest transactions)
- Pairwise breakdown for detailed view
- Monthly filtering
- Per-member detail (which expenses make up their balance)

### 5. Member Management
- View all members with join/leave dates
- Membership timeline enforcement (no splits before join or after leave)

## 16 Anomaly Types & Handling Policies

| # | Type | Severity | Policy |
|---|------|----------|--------|
| 1 | Exact Duplicate | INFO | Keep row with note, skip other |
| 2 | Format Error (comma in amount) | INFO | Auto-clean, remove comma |
| 3 | Invalid Precision (3+ decimals) | INFO | Round to 2 decimal places |
| 4 | Name Mismatch | WARNING | Suggest match, require confirmation |
| 5 | Missing Payer | ERROR | Block import, require payer assignment |
| 6 | Settlement as Expense | INFO | Reclassify as Settlement |
| 7 | Percentage Sum ≠ 100 | ERROR | Block import, require manual fix |
| 8 | Unknown Participant | WARNING | Import but exclude unknown from split |
| 9 | Conflicting Duplicate | WARNING | Surface both, user picks one |
| 10 | Negative Amount | INFO | Import as refund |
| 11 | Invalid Date Format | INFO | Parse intelligently |
| 12 | Missing Currency | INFO | Default to INR |
| 13 | Zero Amount | INFO | Skip row entirely |
| 14 | Ambiguous Date | WARNING | Surface note, require confirmation |
| 15 | Post-Departure Expense | INFO | Remove departed member, recalculate |
| 16 | Conflicting Split Type | INFO | Trust share values over label |

## UI Screens
1. Login / Register
2. Dashboard (balance summary + simplified debts)
3. Expenses list (filterable)
4. Expense detail (split breakdown + currency info)
5. CSV Import (upload + anomaly review)
6. Import Report (history of all import runs)
7. Settlements (record new + view history)
8. Members (view all with dates)

## CSV Expected Headers
`date`, `description`, `paid_by`, `amount`, `currency`, `split_type`, `split_with`, `split_details`, `notes`

## Currency Policy
- USD converted to INR at fixed rate: 1 USD = 84 INR
- Rate is fixed at import time
- Store: original_amount, currency, exchange_rate, converted_amount_inr
