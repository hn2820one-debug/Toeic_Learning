# Closed-Loop TOEIC Upgrade Docs

This folder contains the implementation-facing artifacts for turning TOEIC Trainer into a real closed-loop learning system.

## Documents

- `phase1-skill-map.md` — canonical Phase 1 skills, topics, and taxonomy normalization gaps
- `technical-design.md` — system architecture, runtime responsibilities, and data-model direction
- `delivery-plan.md` — milestone-by-milestone implementation roadmap
- `prompt-pack.md` — versioned prompt inventory and JSON contracts

## Matching code scaffolding

- `src/content/programs/phase1/` — file-based program and module definitions
- `src/lib/llm/closed-loop-prompts.ts` — prompt builders for the new learning loop
- `src/lib/llm/types.ts` — shared output and task-type contracts
