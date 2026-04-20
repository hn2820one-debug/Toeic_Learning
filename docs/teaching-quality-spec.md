# 教學品質規格 · Teaching quality spec（自學 UX）

本文件收斂 **lesson / hint / 錯題回饋 / 干擾項 / listening workbook** 的內容品質標準，避免各功能各自為政。  
實作上的長度與語境優先順序見 `src/lib/content/teaching-style.ts` 與 `src/lib/content/example-context.ts`。

---

## 1. Lesson 的標準結構

與 `markdownToDisplayBlocks`（`src/lib/learn/lesson-display.ts`）對齊的 **教學順序**：

1. **例句／對照**（`example_pair`）— 先看句子，再抽規則；正例與對照並陳。
2. **識別信號**（`pattern_signal`）— 圈出「像答案的線索」、差異觀察，**短**、可掃讀。
3. **核心規則**（`rule`）— 收成 **1–3 條可執行步驟**，避免長篇教條。
4. **常見錯誤**（`trap`）— 誤選長什麼樣 → 為何看起來合理 → 實際為何錯（三段，各 **一句為主**）。
5. **應試提示**（`exam_tip`，選填）— 可折疊，**不**重複貼上整段規則。
6. **快速自測**（`micro_check`）— 一題、短題幹；答案與解析 **預設摺疊**。

**原則**：**例子優先、規則跟進**；禁止「先講長理論再舉例」作為主軸（見 §8）。

---

## 2. Hint 的三層結構（PRACTICE / 同源邏輯）

與 `generateAdaptiveHint` / `buildPracticeHints`（`hint1`–`hint3`）對齊：

| 層級 | 角色 | 應該做 | 不應該做 |
|------|------|--------|----------|
| **Hint 1** | 方向／線索 | 指到題幹或選項中的**信號**（位置、一致性、時態等），可含極短題幹摘要 | 把完整解題步驟寫完 |
| **Hint 2** | 規則或比對策略 | 用**一句規則**或「刪去法／比對兩項」的短指引；可引用 explanation 精簡句 | 複製整段教材或變成第二篇 lesson |
| **Hint 3** | 邊界／收斂 | 逼近正解邊界（仍鼓勵學習者自己按選）；必要時才點出正解字母與一句核對理由 | 長篇論述、重複 hint2 |

**長度**：見 `TEACHING_LENGTH_LIMITS`（`teaching-style.ts`）；hint 整體應可在 **30 秒內讀完一層**。

---

## 3. 錯題回饋的標準結構

與 `ChoiceFeedback` / `buildChoiceFeedback`（`src/lib/choice-feedback.ts`）對齊，**答錯時**至少具備：

1. **為何你選的會像對的**（`whySelectedLooksPlausible`）— 承認干擾項的合理性。
2. **決定性差異**（`decisiveDifference`）— 正解與誤選的**一道分界**（文法、語意、搭配、題幹線索）。
3. **一句可帶走的規則**（`ruleInOneSentence`）。
4. （選填）**下一題怎麼做**（`retryTip`）— 可操作、不空談。

禁止：**只顯示「正解是 B」**而無錯因與對照（見 §8）。

---

## 4. Distractor analysis（干擾項分析）的標準格式

撰寫或編修題目解析時，建議每題具備：

- **正解**：一句話說明**為何在題幹下成立**（不只「正確」）。
- **至少 1 個主要干擾項**：**為何吸引人** + **哪一條線索排除它**（可併入 `explanation` / notes，供 feedback 拆分使用）。

口徑與 `splitExplanationForFeedback` 相容：解析宜 **先短句、可機讀**，避免散文式模型作文。

---

## 5. Listening workbook 的內容規格

與 `ListeningWorkbook` / `ListeningWorkbookClient` 對齊：

- **影片**：站外開啟；題本內只給 **標題、來源、建議起訖秒、外連**，不主打播放器 UI。
- **流程**：先聽 → 第一輪題 → 重聽 → 第二輪題 → **transcript 預設摺疊** → key phrases → dictation / shadowing → takeaway → 隔日 1–2 回顧點。
- **題目**：主旨／細節／意圖／同義轉換等 **標註題型**；選項簡短、避免堆砌同義詞炫耀。
- **逐字稿**：勿預設全文展開；鼓勵「聽完再開」的節奏。
- **文案**：與全站 learner-facing tone 一致（§6）；例句場景優先見 §7。

---

## 6. Learner-facing 文案原則

- **像老師帶一題**：一句一重點；**先具體再抽象**。
- **中英**：標籤可雙語；**教學句以使用者母語優先**（本專案以繁中為主軸時，英文為輔助短句）。
- **語氣**：肯定努力、不羞辱；錯了是「線索沒對完」不是「你不夠聰明」。
- **長度**：單屏可掃讀；具體數字見 `TEACHING_LENGTH_LIMITS`。
- **結構**：列表優於長段；**大段無分區**為壞味道（§8）。

---

## 7. FSE／技術／商務語境例句原則

撰寫或審題時，**例句場景優先順序**（見 `EXAMPLE_CONTEXT_PRIORITY`）：

1. **半導體現場服務工程師（FSE）日常** — 裝機、驗機、客戶現場溝通、ticket、版本／校驗用語。
2. **一般技術工作** — 維修、安裝、校正、測報、handover。
3. **商務職場** — 會議、郵件、排程、對外窗口。
4. **一般 TOEIC 常見場景** — 交通、購物等，**不**作為唯一素材來源。

**避免**：一開始就大量使用與目標使用者無關的抽象生活例子，或過度「通篇辦公室雞湯」而無可操作的語言線索。

---

## 8. 不應出現的壞味道清單

| 壞味道 | 說明 | 改善方向 |
|--------|------|----------|
| 大段無分區文字 | 一屏密閉字牆，無標題／列表／卡片 | 對齊 lesson block 或強制分段 |
| 先講長理論再舉例 | 違反「例子優先」 | 例句 → 信號 → 規則 |
| Hint 寫成第二篇 lesson | hint2/3 篇幅失控、重述整課 | 依三層角色裁切；用長度上限 |
| 答錯只顯示正解不分析錯因 | 學習者無法從錯誤學 | 使用 ChoiceFeedback 結構 |
| Transcript 一打開全部攤開 | 破壞「先聽再看稿」 | 預設摺疊（listening 已實作） |
| 回饋像模型作文 | 長、泛、無題幹錨點 | 錯因 **短**、對準選項與線索 |
| 同一概念一次丟太多例句 | 認知負荷過高 | 1 概念 1–2 例，其餘進進階課或題庫 |
| 過度抽象、脫離熟悉場景 | 學習者難建立線索 | 依 §7 選場景；可一句點明場景再出句 |

---

## 9. 與程式碼的對應（維護用）

| 領域 | 主要程式入口 |
|------|----------------|
| Lesson 分块 | `markdownToDisplayBlocks`, `DisplayLessonBlockView` |
| Hint 三層 | `buildPracticeHints`, `generateAdaptiveHint`, `validateHintSet` |
| 錯題回饋 | `buildChoiceFeedback`, `ChoiceFeedbackPanel` |
| 長度／tone 常數 | `src/lib/content/teaching-style.ts` |
| 例句場景優先 | `src/lib/content/example-context.ts` |

本規格為 **living doc**：新增功能時應先檢查是否違反 §6–§8，再更新本文件與常數檔。
