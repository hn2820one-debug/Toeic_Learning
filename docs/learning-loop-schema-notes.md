# Learning loop execution schema (Prisma)

**Blueprint alignment:** `docs/erd-v2.md` — this migration **implements** the execution-layer tables described there (with explicit `LearningSession` / `LearningSessionItem` models instead of only aliasing `StudySession`).

**Non-goals for this migration:** No route changes, no removal of legacy tables, no switch of `/training` to the new models.

---

## Model purposes

| Model | Purpose |
|-------|---------|
| **LearningTopic** | Canonical row per **Phase1TopicKey** (`topicKey` PK). Optional labels for DB-backed lookups; content titles still live in `src/content/programs/phase1/skill-map.ts`. |
| **Lesson** | One row per **moduleKey + lessonIndex**, aligned with module `lessonOutline` / `lessonObjectives` in `modules.ts`. |
| **LessonPracticeItem** | **Join only:** `Lesson` ↔ `QuestionBankItem` with `position`. No duplicate question text. |
| **UserTopicProgress** | Per-user **TopicProgressStage** for each canonical topic. |
| **ModuleProgress** | Per-user status and scores per **Phase1ModuleKey** (`moduleKey` string). |
| **ProgramProgress** | One row per `(userId, programKey)` for coarse pointer (active module, optional JSON action). |
| **LearningSession** | **Closed-loop session header:** `LearningSessionMode` (learn / practice / test / review / mixed), program/module/lesson context, lifecycle. |
| **LearningSessionItem** | Ordered **question list** for that loop session (bank ids only). |
| **CheckpointAttempt** | Deterministic checkpoint pass/fail, optional links to loop or legacy session. |
| **StudyTask** | Minimal queue row for planners (taskType aligns with **Phase1SessionMode** strings in `types.ts`). |

**Single place for loop session modes (app constants):** `src/lib/learning-session-mode.ts` (matches Prisma `LearningSessionMode` enum).

---

## Relationship to existing trainer

| Existing | Role |
|----------|------|
| **QuestionBankItem** | **Only** question source of truth. |
| **StudySession** + **StudySessionQuestion** + **AnswerHistory** | Legacy **runtime** used by `/training` today; records answers, snapshots, FSRS/ELO side effects. |
| **FsrsCardState** / **ReviewLog** / **EloState** | Still keyed as today (global learner in SQLite); per-user FSRS is a **future** migration. |
| **LearningSession.studySessionId** | Optional **1:1** link: when a loop run is executed through the existing trainer, this points at the `StudySession` row that actually drove FSRS/ELO and `AnswerHistory`. |

**Transition strategy**

1. **No breaking change:** `/training` keeps creating **StudySession** as now (`mode` string e.g. `quick`).
2. **Closed-loop routes** (`/learn`, …) can create **LearningSession** first (intent + mode enum), then create **StudySession** and set `studySessionId` when the learner starts the MCQ shell.
3. **Until linked**, `studySessionId` stays null; **LearningSessionItem** can still describe the intended question order.
4. **Do not** duplicate `QuestionBankItem` rows; use **LessonPracticeItem** and **LearningSessionItem** as references only.

---

## MVP vs nullable fields

**Generally required for a useful row**

- **LearningTopic:** `topicKey` (PK). Labels nullable until seeded.
- **Lesson:** `moduleKey`, `lessonIndex`, titles.
- **LessonPracticeItem:** `lessonId`, `questionBankItemId`, `position`.
- **UserTopicProgress:** `userId`, `topicKey`, `stage` (defaults to `New`).
- **ModuleProgress:** `userId`, `moduleKey`, `status`.
- **ProgramProgress:** `userId`, `programKey`.
- **LearningSession:** `userId`, `mode`, `status`; `programKey` defaults to `phase1`.
- **LearningSessionItem:** `learningSessionId`, `questionBankItemId`, `position`.
- **CheckpointAttempt:** `userId`, `moduleKey`, `passThreshold`, `passed`.

**Nullable on purpose**

| Field | Why |
|-------|-----|
| `LearningTopic.labelZh` / `labelEn` | Can hydrate from TS or a later seed script. |
| `LearningSession.moduleKey` / `lessonId` | Optional for program-wide review sessions. |
| `LearningSession.studySessionId` | Until the legacy trainer run is created or if the session is planning-only. |
| `CheckpointAttempt.learningSessionId` / `studySessionId` | Link whichever surface recorded the attempt; both optional only if you add stricter validation later. |
| `ModuleProgress.diagnosticAccuracy` / `checkpointAccuracy` | Filled when diagnostics/checkpoints complete. |
| `ProgramProgress.activeModuleKey` / `phaseStatus` / `lastRecommendedActionJson` | Filled when the planner exists. |
| `StudyTask.moduleKey` / `scheduledFor` / `studySessionId` / `learningSessionId` / `skillKeysJson` | Queue flexibility without over-scoping MVP. |

---

## Naming alignment (Phase 1)

- **topicKey:** `Phase1TopicKey` strings (`office`, `finance`, …).
- **moduleKey:** `Phase1ModuleKey` strings (`phase1-document-workflow`, …).
- **programKey:** e.g. `phase1` (`Phase1ProgramKey`).
- **StudyTask.taskType:** use **`Phase1SessionMode`** values from `types.ts` (`diagnostic`, `lesson_drill`, `checkpoint`, `review`, `mixed_practice`) — **not** the same enum as `LearningSession.mode` (see mapping in code when bridging).

---

## Coexistence summary

| New | Coexists with |
|-----|----------------|
| `LearningSession` | `StudySession` (optional FK) |
| `LearningSessionItem` | `StudySessionQuestion` (same bank questions; different session parent until unified by link) |
| `UserTopicProgress` | legacy `TopicMastery` (older aggregate; do not merge automatically) |
| `Lesson` / `LessonPracticeItem` | File-based `PHASE1_MODULES` (DB rows optional cache for FKs) |

---

## Related files

- `prisma/schema.prisma`
- `docs/erd-v2.md`
- `src/lib/learning-session-mode.ts`
