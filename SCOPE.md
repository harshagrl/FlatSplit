# Scope & Anomalies

## CSV Anomalies & Handling Policies

During the CSV import phase, we built a 19-detector pipeline that flagged 16 distinct anomalies across the source file. Here is the breakdown of the anomalies and the handling policy applied to each:

### 1. Pre-Join Date Expenses (Rows 2, 5, 6, 38)
* **Anomaly**: Expense dates matched the exact join date of members (e.g., joined 2026-02-01, expense on 2026-02-01).
* **Policy**: **Allowed (Auto-Resolved)**
* **Why**: An expense on the exact day a member joins should naturally include them. The pipeline was adjusted to use strict less-than (`<`) instead of less-than-or-equal (`<=`) for join date validation.

### 2. Unknown Participants (Row 23)
* **Anomaly**: Split with "Dev's friend Kabir".
* **Policy**: **Flagged & Skipped**
* **Why**: The application strictly manages balances for authenticated flat members. External guest expenses must be absorbed by the host member (Dev) as an unequal split, rather than attempting to track an unregistered guest.

### 3. Conflicting Duplicates (Rows 8 & 9)
* **Anomaly**: "Thalassa dinner" appeared twice with exact same amounts and participants, but one row had a typo.
* **Policy**: **Deduplicated & Skipped Row 8**
* **Why**: Instead of silently importing both and inflating balances, the duplicate detector flags exact matches within a 24-hour window. The user verified Row 9 was the correct entry.

### 4. Not an Expense / Settlement Rows (Row 41)
* **Anomaly**: "Rohan paid Aisha back ₹5,000".
* **Policy**: **Imported as Settlement record**
* **Why**: The pipeline detected SETTLEMENT_DETECTED anomaly, user approved importing it as a Settlement rather than an Expense. It now appears in the Settlements table.

### 5. Foreign Currency (Row 15)
* **Anomaly**: "Goa villa booking" listed as 540 USD.
* **Policy**: **Converted & Allowed**
* **Why**: The schema supports foreign currencies. The pipeline statically converts USD at a fixed 84 INR exchange rate to maintain a unified INR balance ledger.

### 6. Invalid Math - Percentage (Row 31)
* **Anomaly**: Percentage split sum equaled 98% instead of 100%.
* **Policy**: **Flagged & Skipped**
* **Why**: The balance engine requires perfect mathematical accounting. Permitting incomplete splits would cause ledger drift.

### 7. Invalid Math - Unequal (Row 35)
* **Anomaly**: Unequal split amounts did not sum to the total expense amount.
* **Policy**: **Flagged & Skipped**
* **Why**: Similar to percentages, total owed must strictly equal the total paid. 

### 8. Name Mismatch & Typos (Rows 12, 18, 28)
* **Anomaly**: Names like "Priya S" instead of "Priya".
* **Policy**: **Fuzzy Matched (Auto-Resolved)**
* **Why**: The detector uses fuzzy string matching to autocorrect minor typos and trailing initials, reducing friction for the user.

### 9. Category Typos (Row 3)
* **Anomaly**: Category listed as "Griceries".
* **Policy**: **Fuzzy Matched (Auto-Resolved)**
* **Why**: Corrected to "Groceries" to ensure category-based analytics function correctly.

*(Note: The above covers the 16 total occurrences across the 42 rows of the CSV, resulting in 40 successfully imported expenses and 2 correctly skipped rows).*

---

## Database Schema Summary

The architecture utilizes a PostgreSQL database managed via Prisma with 7 core models:

1. **User**: Authentication layer. 
   - Key fields: `id`, `email`, `password_hash`, `member_id`.
   - Relationships: 1:1 with `Member`.
2. **Member**: The core participant entity.
   - Key fields: `id`, `name`, `joined_at`, `left_at`, `is_active`.
   - Relationships: 1:M with `Expense`, `ExpenseSplit`, `Settlement`.
3. **Expense**: The master record for a shared cost.
   - Key fields: `id`, `description`, `original_amount`, `currency`, `exchange_rate`, `converted_amount_inr`, `paid_by_id`, `split_type`.
   - Relationships: 1:M with `ExpenseSplit`.
4. **ExpenseSplit**: The exact calculated breakdown per member.
   - Key fields: `id`, `expense_id`, `member_id`, `owed_amount_inr`.
5. **Settlement**: Represents a payback from one member to another.
   - Key fields: `id`, `from_member_id`, `to_member_id`, `amount_inr`, `date`.
6. **ImportRun**: Tracking payload for batch CSV imports.
   - Key fields: `id`, `filename`, `status`, `total_rows`.
7. **ImportAnomaly**: Tracks specific errors or warnings for CSV rows.
   - Key fields: `id`, `import_run_id`, `row_number`, `anomaly_type`.

---

## Known Edge Cases and Limitations

1. **Exchange Rates**: USD to INR conversion is hardcoded to `84`. A production system would require an integration with an exchange rate API (e.g., ExchangeRate-API) based on the `expense.date`.
2. **Float Precision**: All currency fields utilize `Decimal(12,2)` in PostgreSQL to prevent floating point drift. However, rounding issues (e.g., 100 split 3 ways) assign the remainder to the payer.
3. **Memory Limits**: CSV Parsing occurs fully in memory via `multer.memoryStorage()`. While perfectly fine for files under 5MB, a 1GB file would crash the Node process and would require streaming parsing (`csv-parser` piped via `fs.createReadStream`).
