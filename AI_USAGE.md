# AI Usage Documentation

## Tools Utilized
Primary AI Tool: Google Antigravity (antigravity.google)
Powered by: Gemini models
Secondary reference: Claude (claude.ai) for architecture guidance

The project was built primarily using Google Antigravity as the 
AI coding collaborator, with Claude Code-style prompting methodology.

This project heavily utilized AI-assisted coding to accelerate the build process across the 48-hour deadline. The AI acted as a pair programmer, executing full-stack implementation plans, generating React UI components, scaffolding Prisma schemas, and writing the complex Zod validation layers.

---

## Key Prompts Used per Phase

### Phase 1: Foundation & Setup
> *"Initialize a new monolithic monorepo with React/Vite on the frontend and Express/Node on the backend. Set up Prisma with PostgreSQL. Create a robust AppLayout with a sidebar navigation system using Tailwind CSS and Lucide React icons."*

### Phase 2: Schema & Auth
> *"Implement the authentication flow. Use bcrypt and jsonwebtoken. Provide a register and login endpoint. On the frontend, build an AuthContext that synchronizes the JWT token to local storage and wraps the application in ProtectedRoutes."*

### Phase 3-5: CSV Importer & Anomaly Engine
> *"Build the CSV Import engine. We need a 14-detector pipeline that scans a CSV payload for logical anomalies before writing to the database. Flag duplicates, validate pre-join expenses using strict chronological checks, and map foreign currencies."*

### Phase 7-8: Expenses & Detail Views
> *"Build the AddExpenseModal. Ensure real-time split math validation inline before the user can submit. For the ExpenseDetailPage, ensure you parse the Decimal amounts correctly so the currency formatter does not return NaN or fail to render."*

### Phase 9-10: Settlements & Dashboard
> *"Implement the Greedy Debt Simplification algorithm. The API should return a minimal graph of who owes whom. On the Dashboard, hook up 'Settle Now' buttons that deep-link into the Settlements modal using URL query parameters."*

---

## Concrete Cases of AI Correction

While the AI significantly accelerated development, there were several instances where it generated flawed logic or architectural oversights that required manual intervention and debugging.

### Case 1: multer `diskStorage` vs `memoryStorage`
* **The Error:** The AI initially set up the CSV upload route using `multer({ storage: multer.diskStorage(...) })`. The downstream import pipeline subsequently tried to process the file using `req.file.buffer.toString('utf-8')`.
* **How It Was Caught:** The server silently crashed and returned no HTTP response. Debug logging revealed that `req.file.buffer` was `undefined` because `diskStorage` writes to disk rather than keeping the buffer in RAM. Furthermore, writing to the `/uploads` directory triggered Nodemon to restart the server mid-request.
* **The Fix:** Changed the Multer configuration to use `multer.memoryStorage()` and updated `nodemon.json` to explicitly ignore the `uploads/*` and `tmp/*` directories.

### Case 2: `NAME_MISMATCH` False Positives
* **The Error:** When building the `split_with` parser, the AI treated the entire semicolon-separated string (e.g., `"Aisha;Rohan;Priya;Meera"`) as a single, contiguous name. 
* **How It Was Caught:** Reviewing the `ImportPage` preview UI revealed 86 false-positive `NAME_MISMATCH` entries. Every single valid participant was flagged as an "unknown member".
* **The Fix:** Modified the `parseSplitWith` utility to explicitly split the string by semicolons (`.split(';')`), trim whitespace, and validate each participant individually against the active members list.

### Case 3: `PRE_JOIN_EXPENSE` Same-Day False Positives
* **The Error:** The anomaly detector for pre-join expenses checked if the expense date was less than or equal to (`<=`) the member's join date.
* **How It Was Caught:** Row 2 of the CSV (dated 2026-02-01) falsely flagged Aisha, Rohan, and Priya as invalid participants, even though they officially joined the flat on 2026-02-01.
* **The Fix:** Changed the validation logic to use a strict less-than comparison (`expense_date < member.joined_at`). This ensured that expenses incurred on the exact day of joining were correctly permitted.

### Case 4: Tailwind CSS Cascade Collision
* **The Error:** When styling the Amount Card in the `ExpenseDetailPage`, the AI combined a global component class (`className="card"`) with utility gradients (`bg-gradient-to-br text-white`). The `.card` class contained a `@apply bg-white` directive which overrode the background gradient due to specificity, while the text successfully turned white.
* **How It Was Caught:** The UI rendered what appeared to be a completely blank, zero-height white box. The text was rendering, but it was white text on a white background.
* **The Fix:** Removed the `.card` class entirely from the Amount Card to prevent the `bg-white` component collision, manually reapplying `rounded-2xl shadow-xl p-8` alongside the gradient utilities.
