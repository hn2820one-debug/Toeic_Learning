# TOEIC Trainer — 操作說明（給非工程背景使用者）

# TOEIC Trainer — Operator guide (non-technical)

---

## 1. 這是什麼？ · What is this app?

**中文：** 這是一套在「你自己的電腦」上運行的 TOEIC 練習小工具。題目存在本機資料庫，你可以練習、看紀錄、匯入題目、必要時備份資料。它不是官方 ETS 產品，只是協助你準備考試的個人工具。

**English:** This is a TOEIC-style practice app that runs on **your own computer**. Questions are stored in a local database on your machine. You can practice, review history, import questions, and back up data when needed. It is **not** an official ETS product—just a personal study helper.

---

## 2. 主要頁面做什麼？ · What the main pages do

**中文（簡短）：**

- **首頁 / 儀表板：** 一眼看到練習相關的摘要（例如題庫量、待複習、最近活動）。
- **題庫：** 瀏覽、搜尋、篩選題目；可進入新增或編輯。
- **新增題目 / 編輯題目：** 手動建立或修改一題。
- **匯入：** 用 JSON 或 CSV 批次匯入題目（CSV 要先預覽再確認匯入）。
- **訓練：** 開始一場練習；作答、看解答、給複習評分。
- **歷史紀錄：** 看過去完成的練習場次與每題結果。
- **週報：** 看一段時間內的練習摘要（內容會依你的資料量而變化）。

**English (short):**

- **Home / Dashboard:** High-level study summary (bank size, reviews due, recent activity).
- **Question bank:** Browse, search, and filter; open create or edit screens.
- **New / Edit question:** Add or change one question manually.
- **Import:** Batch import via JSON or CSV (CSV: **Preview**, then **Commit**).
- **Training:** Run a session; answer, reveal, rate for spaced repetition.
- **History:** Past completed sessions and per-question results.
- **Report:** Rolling weekly-style summary (depth depends on how much you have practiced).

---

## 3. 如何啟動？ · How to start the app

**中文：** 這一步通常由熟悉電腦的人幫你設定一次。之後你只要知道「如何開啟網址」即可。

1. 在專案資料夾開啟終端機（命令列）。
2. 執行安裝（只需要偶爾做一次）：`npm install`
3. 執行開發模式：`npm run dev`
4. 用瀏覽器開啟畫面上顯示的網址（預設常見為 `http://127.0.0.1:5173`）。

**English:**

1. Open a terminal in the project folder.
2. Install dependencies (from time to time): `npm install`
3. Start development: `npm run dev`
4. Open the URL shown in the terminal (often `http://127.0.0.1:5173`).

**中文補充：** 若使用「正式編譯」方式，流程會是 `npm run build` 再 `npm run start`；正式模式預設埠號可能是 **3000**，與開發模式的 **5173** 不同。若打不開，請先確認終端機顯示的網址與埠號。

**English note:** For a production-style run: `npm run build` then `npm run start`. The default port for `next start` is often **3000**, not **5173**. Always use the URL your terminal prints.

---

## 4. 日常使用方式 · Day-to-day use

**中文（建議流程）：**

1. 打開首頁，快速看今天待複習或摘要。
2. 到「訓練」開始一場練習；專心做完。
3. 需要時到「歷史紀錄」回看哪裡常錯。
4. 一週結束可看「週報」了解趨勢。
5. 若要補充題目：用「新增題目」或「匯入」。

**English (suggested flow):**

1. Open the dashboard for a quick status check.
2. Go to **Training** and complete a session.
3. Use **History** to review mistakes.
4. Use **Report** for a weekly-style summary.
5. Add items via **New question** or **Import** when needed.

---

## 5. 各功能怎麼用？ · How to use each area

### 5.1 看儀表板 · Dashboard

**中文：** 打開首頁即可。數字會隨你的練習與題庫改變。若剛開始練習，有些區塊可能顯示資料不足，這是正常的。

**English:** Open the home page. Numbers update as you study. Some widgets may say there is not enough data yet—that is normal at the start.

### 5.2 開始訓練 · Start training

**中文：** 進入「訓練」→ 依畫面開始 → 選答案 → 可揭曉正解 → 最後依提示給複習評分（幫助系統安排複習）。

**English:** Open **Training**, follow the prompts, submit answers, reveal if offered, then use the FSRS rating buttons so scheduling can adapt.

### 5.3 看歷史 · Review history

**中文：** 「歷史紀錄」列出已完成場次；可展開看每題對錯。若要刪除某一筆測試紀錄，通常需要會用命令列的人執行專案內附的指令（見開發者 README），不要自己改資料庫檔案。

**English:** **History** lists completed sessions with expandable details. Deleting a specific session is a developer-assisted operation using project scripts—do **not** edit the database file by hand.

### 5.4 看週報 · Read the report

**中文：** 打開「週報」頁面。若已設定 AI 金鑰，部分文字可能由雲端模型產生；若沒設定，畫面仍以本地統計為主。

**English:** Open **Report**. If LLM keys are configured, some narrative text may come from a cloud API; otherwise you still see local statistics.

### 5.5 新增題目 · Add questions manually

**中文：** 「題庫」→ 新增 → 依欄位填寫 → 儲存。題目文字與選項請保持清楚；正確答案只能是 A/B/C/D 之一（依畫面說明）。

**English:** **Question bank → New**; fill fields and save. Correct option must be A/B/C/D as validated by the app.

### 5.6 匯入 JSON · JSON import

**中文：** 到「匯入」頁面，依畫面上的 JSON 格式準備檔案或貼上內容。匯入會跳過重複題目。格式錯誤時，頁面會顯示原因。

**English:** On **Import**, use the JSON shape shown on the page. Duplicates are skipped. Errors are shown in the UI.

### 5.7 匯入 CSV · CSV import

**中文：** 到「匯入」→ 選 CSV 檔 → 按「預覽」→ 檢查解析結果 → 滿意後再按「確認匯入」。若預覽失敗，請檢查檔案是否為標準 CSV、欄位是否符合說明。

**English:** On **Import**, choose a CSV → **Preview** → review → **Commit**. If preview fails, check delimiter/headers against the on-page sample.

### 5.8 匯出資料 · Export data

**中文：** 匯出是給「備份或轉移資料」用的 **網址功能**，通常在瀏覽器或命令列存取。若你不熟悉，請交給協助人員操作。預設只允許從本機（localhost）存取；若要遠端存取，需要設定金鑰並帶上標頭（見開發者 README）。請勿把匯出網址公開在網路上。

**English:** Exports are **HTTP endpoints** for backup or migration, often used via browser or `curl`. By default they are **localhost-only** unless a shared secret is configured. **Never** expose export URLs publicly.

---

## 6. 大改動之前先做什麼？ · Before big changes

**中文：** 只要你即將做「可能影響全部題目或全部紀錄」的操作（例如還原題庫、覆寫資料），請先備份。專案內有備份指令 `npm run backup`（會複製 SQLite 檔）。備份檔請存到安全位置。

**English:** Before destructive operations (bank rebuilds, experiments), **back up**. The project provides `npm run backup` to copy the SQLite file. Store backups somewhere safe.

---

## 7. 常見狀況 · Common problems

**中文：**

- **匯入結果不如預期：** 先回到預覽畫面檢查欄位；CSV 逗號與引號格式常是原因。
- **畫面沒更新：** 重新整理頁面；若仍舊，請重啟 `npm run dev` 或 `npm run start`。
- **網址打不開：** 確認終端機顯示的埠號；開發模式常用 5173，正式啟動常用 3000。
- **AI 功能無法使用：** 需要金鑰與網路；也可能遇到額度或供應商限制。沒有金鑰時，其他本地功能仍可使用。

**English:**

- **Import looks wrong:** Re-check CSV quoting/headers; use Preview first.
- **UI stale:** Hard refresh; restart the dev or production server.
- **Wrong port:** Dev often uses **5173**; `next start` often uses **3000**.
- **LLM features fail:** Keys and network required; quotas apply. Non-LLM features still work offline.

---

## 8. 請不要做的事 · What NOT to do

**中文：**

- **不要**直接用文字編輯器改資料庫檔（例如 `dev.db`），容易整份損毀。
- **不要**隨意刪除專案內不認識的檔案。
- **不要**把匯出網址公開，也不要把備份檔上傳到公開地方。
- **不要**把 API 金鑰貼在公開聊天、信箱或圖片裡；也不要把含金鑰的檔案交給別人。

**English:**

- Do **not** hand-edit the SQLite file.
- Do **not** delete random project files.
- Do **not** publish export URLs or backups publicly.
- Do **not** share API keys or commit them to git.

---

## 9. 需要協助時 · When you need help

**中文：** 把「你做過的步驟」與「畫面上的錯誤文字」（可截圖）交給協助你的人，並說明你是用 `npm run dev` 還是 `npm run start`。

**English:** Share the steps you took and any on-screen error text, and whether you ran **dev** or **production** mode.
