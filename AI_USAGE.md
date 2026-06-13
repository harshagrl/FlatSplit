# AI Usage Log — FlatSplit

This document records every major AI-assisted prompt and decision made during development.

## Session 1 — Requirements Gathering & Planning (2026-06-13)

### Prompt 1: Initial Requirements Interview
**What I asked**: Provided full assignment brief with 16 anomaly types and policies. Asked AI to interview me across 8 categories before building.
**AI response**: Generated 24 targeted questions covering flatmate requirements, membership dates, CSV import UI flow, split types, balance calculation, settlement handling, UI screens, and deployment.
**My decisions**: Answered all 24 questions with specific implementation choices.

### Prompt 2: Build Plan Generation
**What I asked**: After answering all questions, asked AI to generate BUILD_PLAN.md.
**AI response**: Generated comprehensive 9-phase build plan with database schema, API design, anomaly detection architecture, and deployment config.
**4 open questions raised by AI**:
1. Dev's member type → Decided: No enum, use is_active + left_at fields
2. Server language → Decided: Plain JavaScript
3. Expense categories → Decided: Freeform strings via keyword matching
4. CSV column mapping → Decided: Strict header matching only

### Prompt 3: Phase 1 Scaffolding
**What I asked**: Start Phase 1 — scaffold project with full folder structure, dependencies, and placeholder docs.
**AI actions**:
- Created Vite + React client with Tailwind v3
- Created Express server with proper folder structure
- Set up custom Tailwind config with brand design system
- Created base CSS with component classes
- Created app layout with responsive sidebar
- Created auth context, API service, route structure
- Created placeholder pages for all 8 screens
- Created README.md, SCOPE.md, DECISIONS.md, AI_USAGE.md
**What I reviewed**: Verified all files and folder structure before approving git commit.
