# Lesson generation runbook（後台內容工廠）

以 **離線腳本** 預先產生 Phase 1 主題的 Markdown 教學稿，寫入 `lessons.topicKey` + `lessons.bodyMarkdown`。  
**不在** 前台 `/learn` 或 `/learn/[topicId]` 請求路徑中同步呼叫 LLM。

## 架構摘要

| 元件 | 用途 |
|------|------|
| `src/lib/llm/gateway.ts` | 統一 `completeChat()`：依 `LLM_PROVIDER_ORDER` 嘗試 Google → Anthropic → OpenAI；每次 HTTP 呼叫寫入 `LlmUsageLog`。 |
| `src/lib/llm/lesson-generator.ts` | Prompt 組裝、`validateLessonMarkdownStructure()`（標題結構檢查）、可選 `prisma.lesson` upsert。 |
| `scripts/generate-lessons.ts` | 單題 / 全量批次；單題失敗不中斷整批（除非程序例外）。 |

## 環境變數

| 變數 | 說明 |
|------|------|
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | 擇一或多個；gateway 會依序嘗試。皆缺時腳本 **不 crash**，該 topic 會失敗並記錄原因。 |
| `LLM_PROVIDER_ORDER` | 選填，例如 `google,anthropic,openai`（別名 `gemini`→google、`claude`→anthropic）。 |
| `LLM_GATEWAY_GEMINI_MODEL` 等 | 選填，覆寫 gateway 內建模型名稱。 |

## 如何跑單一 topic

```bash
npx tsx scripts/generate-lessons.ts --topic=office
```

## 如何跑全部 Phase 1 topics

```bash
npx tsx scripts/generate-lessons.ts --all
```

順序來自 `src/content/programs/phase1/topic-order.ts` 的 `PHASE1_TOPIC_KEYS_IN_ORDER`。

## 如何 force 重產

若該 `topicKey` 已有非空 `bodyMarkdown`，預設 **跳過**。若要覆寫：

```bash
npx tsx scripts/generate-lessons.ts --topic=office --force
npx tsx scripts/generate-lessons.ts --all --force
```

## 如何查看失敗原因

1. **終端機 JSON 摘要**：腳本結尾會 `console.log` `{ ok, skipped, failed }`；`failed[].reason` 含 gateway 錯、結構驗證錯或 DB 錯。
2. **`LlmUsageLog`**（SQLite / Prisma Studio）  
   - `taskType = lesson_markdown`：成功或供應商失敗。  
   - `promptVersion = lesson-md-factory-v1-structure-reject`：模型有回文字但 **未通過標題結構**，**不會入庫**。

## 結構驗證（為何不用 zod）

產出為 **Markdown 教學文**，不是 JSON schema。  
驗證方式為 **自訂 heading 檢查**（見 `validateLessonMarkdownStructure`）：必須含且為 `##` 獨立一行的六個繁中標題：

1. 核心規則  
2. 識別信號  
3. 例句  
4. 常見錯誤  
5. 應試提示  
6. 快速自測  

另檢查全文長度下限，避免空殼。不合格時會再寫一筆 `LlmUsageLog`（`success=false`）。

## 入庫後如何驗證

```bash
npx prisma studio
```

開啟 `lessons`：確認 `topicKey`、`bodyMarkdown`（繁中 Markdown）、`moduleKey` / `lessonIndex`（工廠列使用 `800 + topicOrderIndex` 避免與手動 outline 0–2 撞號）。

或以 SQL：

```sql
SELECT topicKey, length("bodyMarkdown") AS n, "moduleKey", "lessonIndex" FROM lessons WHERE topicKey IS NOT NULL;
```

## 下一步：`/learn/[topicId]` 如何接此管線

1. **讀** `prisma.lesson.findUnique({ where: { topicKey } })`（或 `findFirst`）。  
2. 若 `bodyMarkdown` 有值，直接渲染 Markdown（勿在 request 內呼叫 LLM）。  
3. 若無資料，顯示「教材尚未發布」並指向管理員跑批次腳本 — **進度／下一步決策仍由應用邏輯與 `UserTopicProgress` 決定，不交給模型。**
