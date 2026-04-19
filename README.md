# TOEIC Trainer

TOEIC Trainer is a personal TOEIC study dashboard built with Next.js, Prisma, and SQLite. The current build focuses on a stable minimum workflow: the app starts correctly, the dashboard loads from the database, the question bank is usable, a basic training session can be completed end-to-end on Windows, and completed session history can be reviewed from the UI.

## Current Status

- Dashboard is live and reads summary data from SQLite.
- Question Bank supports local filtering by topic, difficulty, and keyword, plus single-question create, edit, and safe delete management.
- Training supports a short 5-question run, stores answers in SQLite, and shows a basic session result.
- Navigation, layout, and core project structure are in place.
- History is available for completed training sessions.
- Weekly Report is available as a minimal 7-day summary based on completed training sessions.
- Import accepts a fixed JSON file format and writes new question rows into QuestionBankItem.
- Topic and difficulty now use shared normalization rules across create, edit, import, and seed preparation.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Prisma 7
- SQLite via Prisma libsql adapter

## Routes

- /: Dashboard with learning item count, due review count, session count, and latest score
- /training: 5-question training flow backed by StudySession and AnswerHistory
- /questions: Question bank with server-side filter/search and management entry points
- /questions/new: Dedicated QuestionBankItem create page with server-side validation
- /questions/[id]/edit: Dedicated QuestionBankItem edit page with validation and safe delete rules
- /history: Completed StudySession history with expandable answer details
- /report: Rolling 7-day weekly report with summary totals and topic breakdown
- /import: Fixed-format JSON import for QuestionBankItem

## Project Structure

- src/app: App Router pages and global layout
- src/components/layout: Shared sidebar navigation
- src/lib/prisma.ts: Prisma client setup using DATABASE_URL and PrismaLibSql
- src/lib/questions.ts: Question bank queries and filter helpers
- src/lib/question-fields.ts: Shared topic/difficulty normalization and question validation rules
- src/lib/question-management.ts: Single-question create/edit validation, persistence, and safe delete helpers
- src/lib/training.ts: Training session loading, validation, and answer persistence helpers
- src/lib/history.ts: Completed session history queries and answer detail helpers
- src/lib/import.ts: Fixed-format question import validation and write helpers
- prisma/schema.prisma: Database schema
- generated/prisma: Generated Prisma client output
- dev.db: Local SQLite database file

## Getting Started

### Prerequisites

- Node.js 20 or newer recommended
- npm

### Environment

Create a .env file in the project root if needed:

```env
DATABASE_URL="file:./dev.db"
```

### Install Dependencies

```bash
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open the app at:

```text
http://127.0.0.1:5173
```

### Production Build Check

```bash
npm run build
```

## Available Scripts

- npm run dev: Start Next.js on 127.0.0.1:5173
- npm run build: Create a production build
- npm run start: Start the production server
- npm run db:generate: Regenerate Prisma client
- npm run db:migrate: Run Prisma migrations in development
- npm run db:studio: Open Prisma Studio
- npm run db:seed: Run the seed script

## Database Notes

- The project uses SQLite with Prisma.
- Prisma connection config reads DATABASE_URL through prisma.config.ts.
- Runtime access is configured in src/lib/prisma.ts through PrismaLibSql.
- Question bank records live in the questions table.
- Accepted normalized question format uses `difficulty` values A, B, or C only.
- Topic values are trimmed and repeated internal whitespace is collapsed before persistence.
- `correctAnswer` is normalized to uppercase and must be A, B, C, or D.
- Training writes StudySession and AnswerHistory records for each completed run.
- The project intentionally avoids better-sqlite3 in this environment because native module loading failed on Windows.

## Normalized Seed Format

Use the same normalized object shape for `/import` and future larger structured seed data:

```json
[
	{
		"questionText": "The accounting manager requested a revised invoice before approving the payment.",
		"optionA": "revised invoice",
		"optionB": "security badge",
		"optionC": "warehouse shelf",
		"optionD": "office umbrella",
		"correctAnswer": "A",
		"explanation": "A revised invoice is the only option that fits the payment approval context.",
		"topic": "Finance",
		"difficulty": "A"
	}
]
```

- `questionText`, `optionA`, `optionB`, `optionC`, `optionD`, and `topic` must be non-empty after trimming.
- `topic` is stored after trimming and collapsing repeated internal whitespace.
- `correctAnswer` is normalized to uppercase and must be A, B, C, or D.
- `difficulty` is normalized to uppercase and must be A, B, or C.
- `explanation` is optional and blank values are stored as null.
- Import skips rows whose `questionText` already exists or already appeared earlier in the same file.

## Windows Port Note

On this machine, ports 3000 and 3001 fall inside a Windows excluded TCP port range. The active network stack includes HNS, Hyper-V, WinNAT, and WSL docker-desktop networking, which can reserve those ports. Because of that, the development script defaults to port 5173.

If you see listener errors on 3000 or 3001, use the default npm run dev command instead of forcing those ports.

## Current Limitations

- The training flow is intentionally minimal and does not yet implement spaced repetition, review scheduling, or analytics.
- The dashboard still uses its original summary queries and does not yet surface StudySession history.
- The app works with an empty database, but question and training pages require seeded or imported questions to be useful.
- Import is intentionally minimal and currently supports JSON files only.
- History is intentionally minimal and currently focuses on completed sessions only.
- Weekly Report is intentionally minimal and currently focuses on a fixed rolling 7-day window without charts.
- Question management is intentionally minimal and currently supports one-question create/edit/delete only.

## Verification Summary

- Production build completes successfully with npm run build.
- Development server starts successfully on 127.0.0.1:5173.
- Dashboard responds with HTTP 200 in local testing.
- /questions responds with HTTP 200 and renders seeded question content.
- /questions/new responds with HTTP 200 and can create one QuestionBankItem from the UI with validation.
- /questions/[id]/edit can be used to review and correct one QuestionBankItem from the UI.
- /training responds with HTTP 200 and can persist StudySession and AnswerHistory records in SQLite.
- /history responds with HTTP 200, renders completed sessions newest first, and shows expandable answer details.
- /report responds with HTTP 200 and renders a rolling 7-day summary plus topic breakdown from completed sessions.
- /import responds with HTTP 200 and supports fixed-format JSON question imports with shared validation, normalization, duplicate skipping, and result summaries.