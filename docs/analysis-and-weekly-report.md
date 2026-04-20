# Analysis and weekly report pipeline

This document defines the deterministic pipeline shared by:

- `/analysis`
- `/report`
- future weekly-summary and recommendation surfaces

LLM is optional and only rewrites copy. Core ranking and next actions remain deterministic.

## Data sources

- `AnswerHistory` snapshots (`stemSnapshot`, `topicSnapshot`, `correctAnswerSnapshot`, `explanationSnapshot`, `topicKeySnapshot`)
- `LearningSession` + `LearningSessionItem` (`testStateJson`, `reviewStateJson`) for timeout/slow behavior
- FSRS queue stats (`getQueueStats`) for due backlog
- Learning path engine (`getRankedLearningTasks`) for final next-action routing

## Core pure functions (`src/lib/analysis-rules.ts`)

1. `aggregateRecentLearningStats()`
   - 7/30 day completed sessions
   - total questions, accuracy
   - timeout count and slow-answer count (test/review)
   - review completed count and current due backlog

2. `rankWeakTopics()`
   - group by topic snapshot
   - score by wrong volume + low accuracy penalty + minimum support
   - output top weakness topics with representative wrong answers (max 3 each)

3. `classifyErrorPatterns()`
   - deterministic tags:
     - `concept_misunderstanding`
     - `rushing_or_timeout`
     - `repeated_confusion_same_topic`
     - `false_friends_or_distractor_bias`

4. `recommendNextActionsFromAnalysis()`
   - primary task comes from Prompt 21 engine (`getRankedLearningTasks`)
   - analysis only adds narrative priority (e.g. review backlog or top ROI weakness)

5. `buildWeeklyReportData()`
   - merges 7d/30d stats + top weaknesses + ROI topic + next actions
   - emits deterministic weekly sections and 3 actionable todos

## Export

- helper: `exportRecentWrongAnswers()` in `src/lib/analysis-export.ts`
- endpoint: `GET /api/analysis/wrong-answers?format=csv|json&days=7|30`
- columns:
  - `answeredAt`
  - `topicSnapshot`
  - `topicKeySnapshot`
  - `questionTextSnapshot`
  - `correctAnswerSnapshot`
  - `userChoice`
  - `explanationSnapshot`

## Deterministic vs LLM

- deterministic:
  - weakness ranking
  - error pattern classification
  - next action selection and routing
  - weekly report structure and recommendations
- LLM (optional):
  - polish deterministic report into coaching prose

