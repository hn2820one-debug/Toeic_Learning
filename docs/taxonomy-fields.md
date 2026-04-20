# Question bank taxonomy columns (`QuestionBankItem`)

**Model:** `QuestionBankItem` (table `questions`) — this is the **active** reading / Part 5–style bank used by training, history, FSRS, and imports.

**Related:** `topic` (display / filter string), `notes` (legacy structured hints, grammar lines) remain. New columns are **explicit** curriculum hooks so routing and analytics can stop inferring from free text alone.

---

## Field semantics

| Column | Intended meaning | MVP UI |
|--------|------------------|--------|
| `skillKey` | Canonical Phase 1 skill id (`Phase1SkillKey`), e.g. `vocabulary.document-workflow`. | Optional; may stay null until backfill. |
| `topicKey` | Canonical topic bucket (`Phase1TopicKey`), e.g. `office`, `finance`. **Not** the same as display `topic` until aligned. | Optional. |
| `moduleKey` | Curriculum module id (`Phase1ModuleKey`), e.g. `phase1-document-workflow`, when the item is tied to a module track. | Optional. |
| `sourceQuality` | How the row was authored / ingested (provenance). | Set by code paths; not required on manual forms. |
| `priorKnown` | Cold-start signal: user or seed marks item as already known vs unknown (FSRS seed scripts use this). **Already existed before taxonomy work.** | Optional (CSV / future UI). |

---

## `sourceQuality` allowed values

Defined in code as `QUESTION_SOURCE_QUALITY_VALUES` (`src/lib/question-fields.ts`):

- `seed` — inserted from curated seed / `PERSONALIZED_PHASE1_BANK` rebuild script  
- `import_json` — JSON array import on `/import` (default when column omitted in file)  
- `import_csv` — CSV commit path  
- `manual` — single-question create from `/questions/new` (default when form omits taxonomy)  
- `llm` — reserved for future LLM-generated rows  
- `reviewed` — reserved for human-reviewed/generated cleanup  
- `unknown` — explicit “we don’t know” or legacy catch-all  

Validation accepts only these strings (case-insensitive) when the field is **present** in the payload.

---

## Who sets what (by pipeline)

| Pipeline | Typical `sourceQuality` | `skillKey` / `topicKey` / `moduleKey` |
|----------|-------------------------|----------------------------------------|
| Destructive Phase 1 bank rebuild (`npm run db:rebuild-phase1-bank`) | `seed` (set on insert) | Leave null until seed data or a backfill script fills them. |
| JSON import | `import_json` unless each object sets `sourceQuality` | Optional per-row keys in JSON; validated through `validateQuestionFields`. |
| CSV import | `import_csv` | Not in CSV schema yet → null (future columns). |
| Manual create (`/questions/new`) | `manual` | Omitted → null. |
| Manual edit (`/questions/[id]/edit`) | Unchanged unless you add inputs later | Omitted on save → **existing DB values preserved** (update payload only includes keys that were part of the validated input). |

---

## Nullability (current policy)

- **`skillKey`, `topicKey`, `moduleKey`:** May be **null** for all historical and most new rows until taxonomy normalization and backfill land.  
- **`sourceQuality`:** Set on **create** by helpers (manual / import / seed). Existing rows before migration are **null** until backfilled or re-saved.  
- **`priorKnown`:** Already nullable; unchanged semantics.

---

## Backfill (later — not part of schema-only prompt)

When implementing backfill, likely inputs will include:

- `topic` — map to `topicKey` via a normalization table aligned with `PHASE1_TOPIC_LABELS`.  
- `notes` + `src/lib/question-taxonomy.ts` — infer category / sub-focus, then map to `skillKey`.  
- Curated spreadsheets or module ownership tables — set `moduleKey`.  
- Heuristic: `sourceQuality = unknown` where provenance cannot be recovered.

Do **not** parse `notes` at runtime as the primary routing path once explicit columns are populated; prefer reading `skillKey` / `topicKey` when non-null.

---

## Single validation entry

Optional taxonomy fields are accepted or rejected in **`validateQuestionFields`** (`src/lib/question-fields.ts`). Create/update/import should go through that helper (or the same rules) so behavior stays consistent.

Prisma payloads for create/update are built with **`buildQuestionBankCreateData`** / **`buildQuestionBankUpdateData`** in `src/lib/question-management.ts` to avoid scattering defaults.
