# Closed-Loop TOEIC Upgrade Docs

This folder contains the implementation-facing artifacts for turning TOEIC Trainer into a real closed-loop learning system.

## Documents

- `phase1-skill-map.md` — canonical Phase 1 skills, topics, and taxonomy normalization gaps
- `technical-design.md` — system architecture, runtime responsibilities, and data-model direction
- `delivery-plan.md` — milestone-by-milestone implementation roadmap
- `prompt-pack.md` — versioned prompt inventory and JSON contracts
- `../teaching-quality-spec.md` — **unified pedagogy & learner-facing copy** (lesson order, hint layers, feedback, listening workbook, anti-patterns). Use this when authoring or reviewing content.

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
| `/listening` | External video + workbook (no in-app player) |
