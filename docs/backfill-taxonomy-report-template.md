# Taxonomy backfill — report template

This document describes the **one-off** script `scripts/backfill-taxonomy.ts` (not invoked from the web app).

## Data sources (no `grammarPoints` / `source` columns on `QuestionBankItem`)

| Concept | Where it lives in DB |
|--------|----------------------|
| **topic** | `QuestionBankItem.topic` (display / filter string) |
| **notes** | Canonical `字彙 / Vocabulary | …` lines **or** CSV-imported comma text (former “grammar points”) |
| **grammarPoints** (report column) | **Derived in script**: if `notes` has no `\|` pipe, treat `notes` as grammar-hint text (CSV-style); else leave preview empty |
| **source** | There is **no** separate `source` column. Provenance is **`sourceQuality`** (and seed corpus match by `questionText`). |

## Commands

```bash
# Dry-run (default): writes artifacts, does NOT update the database
npm run taxonomy:backfill

# Persist updates
npm run taxonomy:backfill -- --write
```

## Artifacts (generated under `artifacts/`)

| File | Purpose |
|------|---------|
| `unresolved-taxonomy.json` | Rows where **no** patch could be built (nothing to write). |
| `unresolved-taxonomy.csv` | Same as JSON, UTF-8 BOM, for spreadsheets (only written if there is ≥1 unresolved row). |
| `medium-confidence-taxonomy.json` | Rows where at least one field was filled with **medium** confidence (see mapping rules in code). |

Add `artifacts/` to `.gitignore` if you do not want generated files committed.

## Console summary (fill after a run)

| Metric | Value |
|--------|-------|
| Total scanned | |
| Pre-existing field skips (by field) | skillKey: ___, topicKey: ___, moduleKey: ___, sourceQuality: ___ |
| Rows with prepared patch | |
| Auto-filled (high-tier only) | |
| Medium-confidence rows | |
| Unresolved (empty patch) | |
| Notes | |

## Reviewer checklist

- [ ] Spot-check `medium-confidence-taxonomy.json` for surprising `skillKey` / `topicKey`.
- [ ] Confirm `moduleKey` is only set when the mapping layer found a **unique** module for the skill (see `inferModuleKeyFromSkill`).
- [ ] For unresolved rows, decide whether to fix **topic** labels, **notes** format, or curate mappings in `scripts/taxonomy/backfill-mappings.ts` and re-run.

## Related docs

- `docs/taxonomy-fields.md` — column semantics
- `scripts/taxonomy/backfill-mappings.ts` — centralized mapping rules
