# Closed-Loop TOEIC Delivery Plan

## Purpose

This document turns the closed-loop design into an execution roadmap that can be shipped in controlled slices without breaking the current app.

The roadmap assumes:

- keep the existing bank and runtime engine
- build Reading / Grammar / Vocabulary first
- leave Listening as a later expansion track

## Delivery strategy

Do **not** try to ship the full closed-loop system in one pass.

Use this order:

1. lock the content model and prompt contracts
2. add the learner-progress layer
3. launch one thin end-to-end loop
4. expand breadth only after the loop is stable

## Milestone 0 — foundation already prepared

Artifacts created in this step:

- `docs/closed-loop/phase1-skill-map.md`
- `docs/closed-loop/technical-design.md`
- `docs/closed-loop/delivery-plan.md`
- `docs/closed-loop/prompt-pack.md`
- `src/content/programs/phase1/`
- `src/lib/llm/closed-loop-prompts.ts`
- `src/lib/llm/types.ts`

Outcome:

- skill map is frozen
- module structure exists in code
- prompt contracts are versioned
- next engineering step can build on stable inputs

## Milestone 1 — progress and task orchestration

### Goal

Add the minimum runtime state needed to know:

- which module the learner is in
- what the next action is
- whether a checkpoint was passed

### Work

- add Prisma models for learner progress and study tasks
- add server-side helpers for:
  - create / update learner program state
  - create study task
  - mark task complete
  - store checkpoint outcome
- create one resolver that returns `next best action`

### File targets

- `prisma/schema.prisma`
- `src/lib/training.ts`
- new `src/lib/learn/` helpers
- new route loaders for `src/app/learn/`

### Acceptance

- a learner can have an active module
- the app can store one pending drill and one pending checkpoint
- progress state survives refresh and restart

## Milestone 2 — mode-aware session planner

### Goal

Replace the one-size-fits-all planner with a mode-aware session builder while reusing the existing session runtime.

### Work

- keep the current session execution shell
- introduce a planner that accepts:
  - `mode`
  - `moduleKey`
  - `skillKeys`
  - question count
  - hint policy
- let each mode call a different selection strategy

### Selection behavior to implement

- `diagnostic`: broad skill coverage
- `lesson_drill`: module-local and hint-friendly
- `checkpoint`: fixed blueprint, no hints
- `review`: FSRS-first
- `mixed_practice`: broader bridge session

### Acceptance

- session plans are reproducible by mode
- checkpoints cannot silently pull unrelated questions
- review mode still preserves the current FSRS value

## Milestone 3 — learner-facing `Learn` flow

### Goal

Create the first guided learner entrypoint.

### Work

- add `src/app/learn/page.tsx`
- add module overview page
- add lesson page
- add drill launch
- add checkpoint launch
- show next best action on learn home

### UX requirements

- one clear current module
- one clear next step
- visible due reviews
- visible checkpoint readiness
- no ambiguity between lesson, drill, and test stages

### Acceptance

- a learner can enter `Learn` without understanding the underlying schema
- the app always shows the next recommended step, not only raw metrics

## Milestone 4 — AI teaching assist

### Goal

Add instructional AI that helps the learner study, not only react after mistakes.

### Work

- wire prompt builders from `src/lib/llm/closed-loop-prompts.ts`
- add routes for:
  - diagnostic analysis
  - lesson drafting or lesson augmentation
  - guided hints
  - checkpoint coaching
  - weekly study planning
- log new task types through `LlmUsageLog`

### Fallback requirements

- no API key -> deterministic non-AI fallback text
- API failure -> preserve session progress
- invalid JSON -> fail safe, not fail open

### Acceptance

- AI can enrich the flow,
- but the learner can still finish the loop without it

## Milestone 5 — dashboard and report closure

### Goal

Make the dashboard and weekly report reflect the new learning loop instead of only retrospective metrics.

### Work

- add dashboard blocks for:
  - current module
  - next best action
  - checkpoint readiness
  - at-risk skills
  - due reviews
- extend weekly report so it emits:
  - recommended module
  - drill block
  - review block
  - checkpoint readiness
  - one weekly target

### Acceptance

- the dashboard can tell the learner what to do next
- the weekly report becomes operational, not only descriptive

## Thin MVP slice

This is the recommended first shippable loop.

### Scope

- 1 learner
- Reading / Grammar / Vocabulary only
- 3 modules:
  - `phase1-document-workflow`
  - `phase1-core-grammar-control`
  - `phase1-notices-and-decisions`
- 1 diagnostic flow
- 1 lesson template
- 1 drill mode
- 1 checkpoint mode
- 1 weekly next-action block

### Why this slice

- it proves the loop
- it uses the strongest parts of the current bank
- it avoids early expansion into too many topics at once

### MVP success criteria

- learner enters `Learn`
- learner gets routed into one of the 3 modules
- learner finishes one lesson, one drill, one checkpoint
- learner receives clear remediation or advancement
- due reviews remain intact

## Risk register

### Risk 1: taxonomy drift

Cause:

- manual create/edit/import do not normalize skill metadata consistently

Mitigation:

- add one shared normalization path before live module routing

### Risk 2: checkpoint feels random

Cause:

- current composition logic is adaptive but not module-bound

Mitigation:

- checkpoint sessions must use fixed module blueprints

### Risk 3: LLM overreach

Cause:

- prompts become the source of truth for progression

Mitigation:

- keep pass rules deterministic and prompt output advisory

### Risk 4: UX confusion

Cause:

- learner sees too many entrypoints: dashboard, training, learn, history

Mitigation:

- make `Learn` the primary guided path and keep `Training` as the lower-level engine

## Recommended implementation order inside the codebase

1. `prisma/schema.prisma`
2. `src/lib/learn/` progress/task helpers
3. `src/lib/training.ts` mode-aware planner integration
4. `src/app/learn/` routes
5. `src/lib/llm/` new prompt-driven teaching surfaces
6. `src/app/page.tsx` and `src/lib/dashboard.ts`
7. `src/app/report/page.tsx` and `src/lib/llm/weekly-report.ts`

## Definition of done for the full Phase 1 upgrade

The Phase 1 closed-loop upgrade is done when:

- the learner has a guided path, not only freeform practice
- every module has lesson, drill, checkpoint, and review behavior
- weak skills route to remediation predictably
- due review remains active throughout the journey
- dashboard and weekly report can explain the next action clearly
