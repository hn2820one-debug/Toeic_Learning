# Closed-Loop TOEIC Upgrade Docs

The **long-form implementation artifacts** for turning TOEIC Trainer into a real closed-loop learning system live in **`docs/closed-loop/`**. This file is the **index** (moved from `docs/closed-loop/README.md` for the [operator manual](./README.md)).

## Documents

- [`../closed-loop/phase1-skill-map.md`](../closed-loop/phase1-skill-map.md) — canonical Phase 1 skills, topics, and taxonomy normalization gaps
- [`../closed-loop/technical-design.md`](../closed-loop/technical-design.md) — system architecture, runtime responsibilities, and data-model direction
- [`../closed-loop/delivery-plan.md`](../closed-loop/delivery-plan.md) — milestone-by-milestone implementation roadmap
- [`../closed-loop/prompt-pack.md`](../closed-loop/prompt-pack.md) — versioned prompt inventory and JSON contracts
- [`../teaching-quality-spec.md`](../teaching-quality-spec.md) — **unified pedagogy & learner-facing copy** (lesson order, hint layers, feedback, listening workbook, anti-patterns). Use this when authoring or reviewing content.

## Matching code scaffolding

- `src/content/programs/phase1/` — file-based program and module definitions
- `src/lib/llm/closed-loop-prompts.ts` — prompt builders for the new learning loop
- `src/lib/llm/types.ts` — shared output and task-type contracts
- `src/lib/learn/lesson-display.ts` — **example-first** Markdown → display blocks for `/learn/[topicId]`
- `src/lib/content/teaching-style.ts` — length/tone **constants** for hints, feedback, micro-checks (enforcement incremental)
- `src/lib/content/example-context.ts` — **FSE / tech / business** example priority for authors

## Learner-facing routes (closed-loop UX, Prompt 41–50 era)

| Route | Role |
|-------|------|
| `/learn`, `/learn/[topicId]` | Micro-lesson cards, understanding-first |
| `/warmup` | Short activation (not FSRS review) |
| `/practice` | Hints, prediction (optional), revisit, distractor feedback |
| `/test`, `/review` | Checkpoint / FSRS; feedback panel where wired |
| `/calendar`, `/calendar/[date]` | **Learning-activity calendar**: volume by local (Asia/Taipei) day; month stat **effective study days** uses meaningful signals—not “opened a page once.” Day detail lists sessions bucketed by `startedAt`; milestone lines are **same-day snapshots**, not a full stage-change audit trail. |
| `/listening` | External video + workbook (no in-app player) |

## Calendar implementation (meaningful activity)

- `src/lib/calendar/calendar-tags.ts` — month cache tags, `formatYmd` / month bounds in **Asia/Taipei** for day keys.
- `src/lib/calendar/aggregator.ts` — per-day cells: sessions, checkpoint **pass** counts (`CheckpointAttempt.passed`), plan rows, `UserTopicProgress.learnCompletedAt`, and `hasMeaningfulLearningActivity`.
- `src/lib/calendar/meaningful-activity.ts` — single helper for “meaningful activity that day”: completed sessions (practice/test/learn/warmup), review with at least one FSRS rating (or completed review), checkpoint passes, learn completion timestamps, study-plan completed rows.
- Learn flow completion (`markLessonUnderstoodAction` when all lessons understood) calls `revalidateTag(calendarMonthTagForDate(...))` so the month grid refreshes without tagging every low-value learn click.
