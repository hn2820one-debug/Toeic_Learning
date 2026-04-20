# Question write pipeline (normalize-first)

All question writes (manual create/edit, JSON import, CSV commit, and `prisma/seed.ts`) go through **`validateAndNormalizeQuestionInput`** in `src/lib/question-fields.ts` (same implementation as `validateQuestionFields`). Downstream code should only persist **`NormalizedQuestionFields`** from a successful result, plus any extra columns (for example CSV `notes` from grammar points) that are not part of that type.

## Normalized fields

| Field | Behavior |
| --- | --- |
| `questionText` | Trim, collapse internal runs of whitespace to a single space (`normalizeQuestionText`). |
| `optionA`–`optionD` | Trim; must be non-empty strings after trim. |
| `correctAnswer` | Trim, uppercase; must be `A`–`D`. |
| `topic` | Trim, collapse internal whitespace to a single space (`normalizeQuestionTopic`). |
| `difficulty` | Trim, uppercase; must be `A`, `B`, or `C`. |
| `explanation` | Optional string: trim; empty or whitespace-only becomes `null`. Non-string input is rejected. |

## Preserved / optional taxonomy

When a key is **present** on the input object, it is validated and normalized:

- `skillKey`, `topicKey`, `moduleKey` — trim; `null` clears; empty string after trim is stored as `null`.
- `sourceQuality` — lowercase trim; must be a known value or `null` (see `QUESTION_SOURCE_QUALITY_VALUES`).
- `priorKnown` — boolean, or string `"true"` / `"false"`, or `null`.

Omitted keys are left unset on `NormalizedQuestionFields` so Prisma builders can decide whether to touch a column (for example manual forms omit taxonomy keys).

## Rejected inputs

Failures return a `QuestionValidationIssue` and a message from `formatQuestionValidationMessage` (shared across manual and import):

- Missing or invalid core fields (`questionText`, any option, `correctAnswer`, `topic`, `difficulty`).
- Invalid `explanation` type (non-string when provided).
- Invalid optional taxonomy / `sourceQuality` / `priorKnown`.

## `sourceQuality` defaults

`buildQuestionBankCreateData` in `src/lib/question-management.ts` sets `sourceQuality` when the normalized object does not carry one:

| Entry | Default |
| --- | --- |
| Manual create | `manual` |
| JSON import | `import_json` |
| CSV commit | `import_csv` |
| Seed | `seed` (also forced on upsert **update** so re-seeding stays consistent) |

## Duplicate detection

**Strategy:** `DUPLICATE_QUESTION_TEXT_STRATEGY` — exact equality on the stored `QuestionBankItem.questionText` column, which must equal the **validated** stem (`normalizeQuestionText`).

Manual create/update use `findQuestionBankItemIdWithSameQuestionText`. JSON import and CSV commit batch-query existing rows by the same normalized strings. Wording differs by UI (import vs form), but the rule is identical.

## CSV-specific notes

- Preview trims each cell before Zod parsing (`csv-preview.ts`).
- Commit runs every row through `validateAndNormalizeQuestionInput` again; if that ever disagrees with preview, commit fails with a pipeline error (should be rare).
- `grammarPoints` is not validated by the question pipeline; it is formatted into `notes` only.

## Edge cases not covered here

- No LLM-based cleaning (by design).
- CSV `grammarPoints` is free text; only comma-splitting/trimming is applied.
- Legacy rows in the DB may still contain older stem formatting until edited or re-imported; duplicate checks always compare against stored strings.
