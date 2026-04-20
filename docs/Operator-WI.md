# TOEIC Trainer — 操作說明（給非工程背景使用者）

# TOEIC Trainer — Operator guide (non-technical)

---

## 1. 這是什麼？ · What is this app?

**中文：** 這是一套在「你自己的電腦」上運行的 TOEIC 練習小工具。題目存在本機資料庫，你可以練習、看紀錄、匯入題目、必要時備份資料。它不是官方 ETS 產品，只是協助你準備考試的個人工具。

**English:** This is a TOEIC-style practice app that runs on **your own computer**. Questions are stored in a local database on your machine. You can practice, review history, import questions, and back up data when needed. It is **not** an official ETS product—just a personal study helper.

---

## 2. 主要頁面做什麼？ · What the main pages do

**中文（簡短）：**

- **首頁 / 儀表板：** 一眼看到練習相關的摘要（例如題庫量、待複習、最近活動），並提示「下一步該做什麼」（與今日學習同一套排序）。
- **今日學習（/learn）：** 依「複習 → 驗收 → 練習 → 新主題」排好的清單；從這裡進入主題閱讀、練習或複習任務。
- **能力地圖（/progress）：** 看 Phase 1 主題在各階段的進度，按鈕會帶你到與今日學習一致的下一步。
- **主題學習（/learn/主題代號）：** 讀教材課節（不計分、不計時）；依畫面標示讀完並確認理解後，才適合進入該主題的練習。
- **題庫：** 瀏覽、搜尋、篩選題目；可進入新增或編輯。
- **新增題目 / 編輯題目：** 手動建立或修改一題。
- **匯入：** 用 JSON 或 CSV 批次匯入題目（CSV 要先預覽再確認匯入）。
- **每日訓練：** 從整份題庫抽題的一場練習；作答、看解答、給複習評分（與「單一主題下的練習」不同入口，但都是有效練習）。
- **歷史紀錄：** 看過去完成的練習場次與每題結果。
- **週報：** 看一段時間內的練習摘要（內容會依你的資料量而變化）。

**English (short):**

- **Home / Dashboard:** Study summary (bank size, reviews due, recent activity) plus a **next action** that matches **Today's learning** ordering.
- **Today's learning (`/learn`):** A prioritized list (**review → test → practice → learn**); use it to open topic reading, practice, or review tasks.
- **Mastery map (`/progress`):** Phase 1 topic stages; buttons deep-link to the same next steps as `/learn`.
- **Topic learn (`/learn/<topic>`):** Read lesson segments (**no score, no timer**); finish and mark understanding before topic-scoped practice.
- **Question bank:** Browse, search, and filter; open create or edit screens.
- **New / Edit question:** Add or change one question manually.
- **Import:** Batch import via JSON or CSV (CSV: **Preview**, then **Commit**).
- **Daily training:** A session drawn from the full bank; answer, reveal, rate for spaced repetition (different entry than **topic practice**, both valid).
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

1. 打開「今日學習」，依清單做最上面的一項（可能是複習、驗收、練習或讀新主題教材）。
2. 若進入「主題學習」，請依序讀完課節並在畫面上標示「已理解」，再依提示前往練習。
3. 首頁儀表板可快速看摘要與「下一步」；需要整庫抽題時再用「每日訓練」。
4. 需要時到「歷史紀錄」回看哪裡常錯。
5. 一週結束可看「週報」了解趨勢。
6. 若要補充題目：用「新增題目」或「匯入」。

**English (suggested flow):**

1. Open **Today's learning** and do the top task (review, test, practice, or read a new topic).
2. On **Topic learn**, read each segment and mark **understood**, then follow the prompt to **practice** that topic.
3. Use the **Dashboard** for a quick snapshot and next action; use **Daily training** when you want a classic full-bank session.
4. Use **History** to review mistakes.
5. Use **Report** for a weekly-style summary.
6. Add items via **New question** or **Import** when needed.

---

## 5. 各功能怎麼用？ · How to use each area

### 5.1 看儀表板 · Dashboard

**中文：** 打開首頁即可。數字會隨你的練習與題庫改變。若剛開始練習，有些區塊可能顯示資料不足，這是正常的。首頁的「下一步」與「今日學習」使用同一套優先順序。

**English:** Open the home page. Numbers update as you study. Some widgets may say there is not enough data yet—that is normal at the start. The home **next action** uses the same ordering as **Today's learning**.

### 5.2 今日學習與能力地圖 · Today's learning and mastery map

**中文：** 「今日學習」列出你現在最值得做的幾件事（例如先複習到期項目）。點進主題後可能是「讀教材」或「練習／驗收／複習」，請依畫面說明。「能力地圖」用較寬的視角看各主題進度，按鈕會帶你到對應任務。

**English:** **Today's learning** lists what to do next (for example due reviews first). Follow each link—**topic reading**, **practice**, **test**, or **review** as labeled. **Mastery map** shows broader Phase 1 progress with matching CTAs.

### 5.3 主題學習（讀教材）· Topic learn (lessons)

**中文：** 這裡重在「看懂」，沒有計分與計時。用上一則／下一則切換課節；讀完後按「已理解」讓系統記錄。全部課節完成後，畫面會引導你到該主題的練習。若顯示「尚無課節」，代表資料庫裡還沒有教材內容，需要由協助人員用專案內腳本預先生成（一般使用者無法在畫面上按一下就生出教材）。

**English:** **Topic learn** is **understanding-first**: **no score, no timer**. Navigate segments; press **Understood** to record progress. When complete, the page links to **topic practice**. If you see **no lessons yet**, the database has no lesson rows yet—ask your helper to run the project’s offline generation script (lessons are **not** created live in the browser).

### 5.4 開始每日訓練 · Start daily training

**中文：** 進入「每日訓練」→ 依畫面開始 → 選答案 → 可揭曉正解 → 最後依提示給複習評分（幫助系統安排複習）。這是從整份題庫抽題的路徑，與「單一主題練習」入口不同。

**English:** Open **Daily training**, follow the prompts, submit answers, reveal if offered, then use the FSRS rating buttons so scheduling can adapt. This path draws from the **full bank**, unlike **topic-scoped practice**.

### 5.5 看歷史 · Review history

**中文：** 「歷史紀錄」列出已完成場次；可展開看每題對錯。若要刪除某一筆測試紀錄，通常需要會用命令列的人執行專案內附的指令（見開發者 README），不要自己改資料庫檔案。

**English:** **History** lists completed sessions with expandable details. Deleting a specific session is a developer-assisted operation using project scripts—do **not** edit the database file by hand.

### 5.6 看週報 · Read the report

**中文：** 打開「週報」頁面。若已設定 AI 金鑰，部分文字可能由雲端模型產生；若沒設定，畫面仍以本地統計為主。

**English:** Open **Report**. If LLM keys are configured, some narrative text may come from a cloud API; otherwise you still see local statistics.

### 5.7 新增題目 · Add questions manually

**中文：** 「題庫」→ 新增 → 依欄位填寫 → 儲存。題目文字與選項請保持清楚；正確答案只能是 A/B/C/D 之一（依畫面說明）。

**English:** **Question bank → New**; fill fields and save. Correct option must be A/B/C/D as validated by the app.

### 5.8 匯入 JSON · JSON import

**中文：** 到「匯入」頁面，依畫面上的 JSON 格式準備檔案或貼上內容。匯入會跳過重複題目。格式錯誤時，頁面會顯示原因。

**English:** On **Import**, use the JSON shape shown on the page. Duplicates are skipped. Errors are shown in the UI.

### 5.9 匯入 CSV · CSV import

**中文：** 到「匯入」→ 選 CSV 檔 → 按「預覽」→ 檢查解析結果 → 滿意後再按「確認匯入」。若預覽失敗，請檢查檔案是否為標準 CSV、欄位是否符合說明。

**English:** On **Import**, choose a CSV → **Preview** → review → **Commit**. If preview fails, check delimiter/headers against the on-page sample.

### 5.10 匯出資料 · Export data

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
- **主題學習顯示沒有課節：** 代表教材尚未寫入資料庫，需由協助人員依開發者文件產生；不是網路斷線就一定會發生。

**English:**

- **Import looks wrong:** Re-check CSV quoting/headers; use Preview first.
- **UI stale:** Hard refresh; restart the dev or production server.
- **Wrong port:** Dev often uses **5173**; `next start` often uses **3000**.
- **LLM features fail:** Keys and network required; quotas apply. Non-LLM features still work offline.
- **Topic learn shows no lessons:** Lesson rows are missing in the database—ask your helper to run the offline generation flow; this is not always a network outage.

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
