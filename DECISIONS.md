# Architecture Decisions — FlatSplit

## Decision Log

### D001 — No TypeScript
**Date**: 2026-06-13
**Decision**: Use plain JavaScript for both client and server.
**Rationale**: TypeScript setup time not worth it for a 2-day build. The import engine will be carefully structured with JSDoc comments and Zod validation to compensate for lack of static types.

### D002 — No member_type enum
**Date**: 2026-06-13
**Decision**: Distinguish guest vs. departed flatmate using existing fields only.
**Approach**:
- Dev: `is_active = false`, `left_at = null`, no linked User account → guest/visitor
- Meera: `is_active = false`, `left_at = 2026-03-31`, no linked User account → departed flatmate
**Rationale**: Keep schema simple. The combination of `left_at` and User linkage captures the distinction.

### D003 — Freeform categories
**Date**: 2026-06-13
**Decision**: Categories are freeform strings, not a fixed enum.
**Approach**: Extract category from description via simple keyword matching during import. Store as nullable string. Allow filtering but don't block import on unknown categories.

### D004 — Strict CSV header matching
**Date**: 2026-06-13
**Decision**: No column mapping UI. Expect exact headers: `date`, `description`, `paid_by`, `amount`, `currency`, `split_type`, `split_with`, `split_details`, `notes`.
**Rationale**: We know the exact CSV format. Column mapping adds complexity with no value for this project.

### D005 — prisma db push over migrations
**Date**: 2026-06-13
**Decision**: Use `npx prisma db push` for schema changes, not `prisma migrate`.
**Approach**: Run `prisma db push` manually from local machine after Supabase is set up. Render build command only runs `npm install && npx prisma generate`.
**Rationale**: Avoids migration file complexity. Same approach as previous project.

### D006 — Fixed exchange rate at import time
**Date**: 2026-06-13
**Decision**: USD → INR at fixed rate of 84. Rate is locked when expense is imported/created.
**Rationale**: Assignment specifies fixed rate. No real-time currency API needed.
