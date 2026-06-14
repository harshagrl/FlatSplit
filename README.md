# FlatSplit — Shared Expenses App

A multi-user shared expenses tracking app built for a group of flatmates. Features a CSV importer that detects, surfaces, and handles 16 categories of data anomalies according to documented policies.

## 🚀 Live Demo

**Frontend (Vercel):** [https://flat-split-umber.vercel.app/](https://flat-split-umber.vercel.app/)
*(Backend is deployed on Render and automatically spins up when you hit the frontend)*

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS v3 |
| Backend | Node.js + Express + Zod validation |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Auth | Custom JWT with bcrypt |
| Deploy | Render (backend) + Vercel (frontend) |

## 🧪 Test Accounts (Pre-seeded)

| Name | Email | Password |
|------|-------|----------|
| Aisha | aisha@test.com | password123 |
| Rohan | rohan@test.com | password123 |
| Priya | priya@test.com | password123 |
| Sam | sam@test.com | password123 |

*Note: Meera and Dev are historical members — they appear in imported expenses but do not have login accounts.*

To test the full import flow:
1. Log in as any account above
2. Navigate to `/import`
3. Upload the provided `Expenses_Export.csv` file
4. Review the anomalies and approve each one
5. Click **Confirm Import**

## Project Structure

```
expenses-app/
├── client/          # React frontend (Vite)
├── server/          # Express API server
├── README.md        # This file
├── SCOPE.md         # Project scope and requirements
├── DECISIONS.md     # Architecture decisions log
└── AI_USAGE.md      # AI assistance documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)

### Server Setup
```bash
cd server
cp .env.example .env    # Fill in your Supabase credentials
npm install
npx prisma generate
npx prisma db push      # Push schema to database
npm run seed            # Seed member data
npm run dev             # Start dev server on :3001
```

### Client Setup
```bash
cd client
cp .env.example .env    # Set API URL
npm install
npm run dev             # Start Vite dev server on :5173
```

## Core Feature: CSV Import Engine

The CSV importer is the heart of this application. It:
1. **Parses** uploaded CSV files
2. **Detects** 16 categories of data anomalies
3. **Surfaces** every problem to the user with clear descriptions
4. **Handles** each anomaly according to a documented policy
5. **Never** silently fixes or skips a data problem

See `SCOPE.md` for the full list of anomaly types and handling policies.

## Members

| Member | Status | Timeline |
|--------|--------|----------|
| Aisha | Active | Feb 1, 2026 → present |
| Rohan | Active | Feb 1, 2026 → present |
| Priya | Active | Feb 1, 2026 → present |
| Sam | Active | Apr 8, 2026 → present |
| Meera | Departed | Feb 1 → Mar 31, 2026 |
| Dev | Guest | Appears in trip expenses only |
