# CONTRIBUTING — TOEIC Trainer

This file serves as the single source of truth for model usage status.
Paste this file as context every time you start a new Copilot session.

---

## Active Models

These models are actively used by the current and planned application workflows.

| Model | Table Name | Status |
|---|---|---|
| QuestionBankItem | questions | **In use** — sole question data source |
| StudySession | study_sessions | **In use** — training session records |
| AnswerHistory | answer_history | **In use** — per-question answer records |
| FsrsCardState | fsrs_card_state | Planned — FSRS spaced repetition state |
| ReviewLog | review_log | Planned — FSRS review log |
| EloState | elo_state | Planned — adaptive difficulty rating |
| TopicMastery | topic_mastery | Planned — per-topic skill tracking |
| StudySessionQuestion | study_session_question | Planned — DB-backed session questions |
| LlmUsageLog | llm_usage_log | Planned — LLM API cost tracking |

---

## Deprecated Models (Do NOT Use)

These models remain in the Prisma schema for historical reasons but must NOT be
referenced in new code. They will be removed in a future cleanup migration.

| Model | Table Name | Notes |
|---|---|---|
| User | users | Single-user app, no auth needed |
| LearningItem | learning_items | Replaced by QuestionBankItem |
| QuestionItem | question_items | Replaced by QuestionBankItem |
| DailySession | daily_sessions | Replaced by StudySession |
| SessionAnswer | session_answers | Replaced by AnswerHistory |
| ReviewQueue | review_queue | Will be replaced by FsrsCardState |
| TopicWeight | topic_weights | Will be replaced by TopicMastery |
| WeeklyReport | weekly_reports | Report logic uses live queries now |
| ScoreHistory | score_history | Will use EloState + dashboard calc |
| ListeningSet | listening_sets | Will be replaced by ListeningSetV2 |
| ListeningQuestion | listening_questions | Will be replaced by ListeningQuestionV2 |

---

## Development Rules

1. **Never import deprecated models** in new `src/` code
2. **Always run `npm run backup`** before any migration
3. **Always run `npm run dev`** after each prompt to verify no crashes
4. **One prompt = one commit** — use the commit message at the end of each prompt

---

## Progress Log

| Date | Prompt | Commit Message |
|---|---|---|
| | 0 | `chore: add backup script and contributing guide` |
