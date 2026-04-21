# Toeic-web — Closeout summary (for ChatGPT review)

## Date / branch

- **Date:** 2026-04-21 (local)
- **Branch:** `main`
- **Remote (observed):** `origin` → `https://github.com/hn2820one-debug/Toeic_Learning.git`

## What was completed this round

- **Closed-loop learning UX (reconciled v2 direction):**
  - Dashboard (`/`) uses `getDashboardDataV2()` — single primary CTA aligned with `buildComposedLearningTasks` / `/learn` (FSRS review → study-plan day → Introduced→practice → Practiced→test → New→learn).
  - Progress (`/progress`) uses `getProgressMapView()` — per-module summary + topic rows; CTAs delegate to `getTopicProgressActions` / `getActionForStage`.
  - Study plan (`/studyplan`) uses `getStudyPlanRuntimeView()` — DB `DailyPlanItem.completed` remains source of truth; non-destructive overlay (`taskKind`, hints when `completedSkillsJson` disagrees with day checkbox).
- **Review flow (`/review`):** FSRS-backed session, Again/Hard/Good/Easy writeback via existing `applyRating`, immediate feedback, loader self-heal when all items rated but session row still `active`.
- **Test / practice flows:** Prior work in repo includes checkpoint test flow and practice session work (see recent commits).
- **`today-task-composer`:** Exported `getDailyPlanTaskKind` for shared routing labels.

## Incomplete / deferred

- **Study-plan CTA anchor topic:** Composer still uses `topicOrder[0]` as default anchor for plan-day links; may not match the “true” topic for a given `primarySkillCode` (known limitation; not fixed this round).
- **Progress CTAs:** Often omit `primaryLearningSkillCode` query params where the planner uses them — precision gap, not a wrong route.
- **Passage / Part 6–7 / listening breadth:** Not a focus of this closeout; repo may still be Part-5-heavy.
- **Automating DailyPlanItem completion** from learning events: still manual checkbox + optional hints.

## Important architecture decisions

- **Single task composer:** `buildComposedLearningTasks` in `src/lib/today-task-composer.ts` is the priority source for home + `/learn` alignment.
- **Single CTA engine for topic stages:** `getTopicProgressActions` in `src/lib/learning-path-rules.ts` drives `/progress` row actions.
- **FSRS:** One scheduler in `src/lib/fsrs.ts`; review actions use `applyReviewRating` → `applyRating` (no second FSRS implementation).
- **Study plan runtime:** Overlay adds metadata only; does not rewrite seeded plan rows.

## Main files / modules touched (high level)

| Area | Paths (examples) |
|------|-------------------|
| Dashboard | `src/app/page.tsx`, `src/lib/dashboard/get-dashboard-data-v2.ts`, `src/lib/dashboard-next-action.ts` |
| Progress | `src/app/progress/page.tsx`, `src/lib/progress/get-progress-map.ts`, `src/lib/progress-view-model.ts` |
| Study plan | `src/app/studyplan/page.tsx`, `src/lib/studyplan/get-studyplan-runtime-view.ts`, `src/lib/study-plan/loader.ts` |
| Review | `src/app/review/*`, `src/lib/review/*`, `src/lib/review-page-loader.ts` |
| Composer | `src/lib/today-task-composer.ts`, `src/lib/learn-dashboard.ts` |

## Build / typecheck / seed / routes

| Check | Status |
|-------|--------|
| `npm run build` | **Passed** in local verification runs (2026-04-21 closeout session). |
| TypeScript / ESLint in build | **Passed** with Next.js 14 build pipeline. |
| `npm run db:seed` / full seed | **Not re-run** as part of this closeout — treat as **未驗證** for this session. |
| Manual browser E2E (click-through all routes) | **未驗證** in this automated session. |

## Risks / known limitations

- **FSRS vs learning item persist order** (review rating): In rare cases FSRS may persist before `LearningSessionItem` update; retry could theoretically double-apply (documented in review audit; not addressed in this closeout).
- **Timezone:** “Today” session counts on dashboard use server local midnight — cross-timezone learners may see off-by-one day.
- **`.gitignore`:** Entire `backups/` folder is ignored — local zip backups are **not** in Git by design.

## Suggested next steps (max 5)

1. Map `primarySkillCode` → `Phase1TopicKey` for study-plan CTAs (replace `topicOrder[0]` anchor).
2. Decide product rules for auto vs manual **DailyPlanItem** completion.
3. Add or extend E2E smoke tests for `/`, `/learn`, `/review`, `/progress`, `/studyplan`.
4. Optional: unify `primaryLearningSkillCode` on `/progress` CTAs when unambiguous.
5. Content / exam fidelity: Part 6/7, mock packs, or score estimator — pick one vertical slice.

---

## Paste summary for ChatGPT review (short)

**Project:** Next.js 14 TOEIC learning app (`toeic-web`). **Branch:** `main`.

**Done:** Dashboard shows one primary next step using the same priority list as `/learn` (FSRS review → 30-day plan day → topic stages). Progress page adds per-module summaries + topic rows with stage-based CTAs from `getTopicProgressActions`. Study plan shows live DB completion state plus non-destructive runtime hints (`taskKind`, skill-list mismatch). Review route uses existing FSRS `applyRating` with Again/Hard/Good/Easy.

**Honest gaps:** Plan-day links may use a coarse default topic anchor; progress CTAs often omit skill query params; seed/db:seed not re-run this session; no full manual E2E in closeout. **Build:** `npm run build` OK in verification.

**Ask ChatGPT:** Review whether the routing/composer split is maintainable, and suggest priority for skill→topic anchoring vs new content.
