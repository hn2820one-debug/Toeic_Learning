import type { Week1LessonUnitId } from "./week1-lesson-units";

/**
 * Canonical Week 1 lesson Markdown (Traditional Chinese, Taiwan wording).
 * Used as LLM fallback and for deterministic QA when API keys are absent.
 * Headings must satisfy `validateLessonMarkdownStructure` in `lesson-generator.ts`.
 */
export const WEEK1_LESSON_STATIC_MARKDOWN: Record<Week1LessonUnitId, string> = {
  week1_day1_baseline_intro: `# Day 1 起點說明：建立學習基準

## 例句
先從語感理解「起點」在做什麼（不必背誦）：
- "Today I'm **establishing a baseline**, not trying to prove everything in one shot."
- "If I'm unsure, I'll still **answer honestly** so the recommendations stay useful."

## 識別信號
只要題目或說明出現「診斷／起點／個人化路徑／學習規劃」這類字樣，就代表今天的重點是蒐集資料，而不是用分數證明能力。

## 核心規則
第一天請把每題當成「回報真實程度」：會就穩定作答，不會就如實反映。系統需要真實訊號，才能把後續 lesson、練習與應試節奏調到適合你的強弱分佈。

## 常見錯誤
- **錯誤範例**：不確定時硬猜「看起來很厲害的選項」，讓診斷看起來很強，結果推薦內容偏離需求。
- **正確做法**：把不確定當成重要訊號；錯題與猶豫題會讓路徑更準。

## 應試提示
這不是正式 TOEIC 計時模式；請用穩定節奏完成，避免為了速度犧牲正確判讀題幹。今天的目標是讓「學習規則」與「練習順序」有可靠起點。

## 快速自測
1. 判斷題：為了讓個人化路徑準確，第一天應該盡量「演得很會」，即使不確定也要選看起來最難的選項嗎？
2. 判斷題：答錯或卡住是正常訊號，只要按真實程度作答，就能讓後續規劃更合理嗎？

**參考答案**：1 否；2 是。`,

  grammar_svc_core: `# 連綴動詞（SVC）核心：形容詞補語，不是副詞硬套

## 例句
- The **sensor remains calibrated** after the firmware update.
- The **new yield figures look promising** this quarter.
- The issue **seems manageable** if we prioritize the hotfix today.
- The dashboard **appears stable** during peak traffic.
- The team **stayed focused** despite the tight release window.

## 識別信號
在題幹或空格附近看到 **sound / appear / remain / seem / become / stay / look** 這類「狀態／感官／變化」連綴動詞，就要先想到：**後面常接形容詞補語**，而不是先用 -ly 副詞去修飾動詞。

## 核心規則
連綴動詞把主詞連到補語，補語多半描述主詞的狀態或身分，因此常用形容詞。Part 5 常見陷阱是把補語位置誤當成「修飾動詞的副詞」，因而誤選 -ly。

## 常見錯誤
- **反例**：The update **sounds clearly** in the release notes.（誤把 clearly 當補語）
- **修正**：The update **sounds clear** in the release notes.（clear 描述主詞狀態）

## 應試提示
先判斷空格是否在「主詞—連綴動詞—補語」鏈上；若是，優先選形容詞或形容詞片語，不要只因為看到 -ly 就選。

## 快速自測
1. 選詞：The readings remain _____ after recalibration.（A）stable（B）stably — 哪一個較符合 SVC？
2. 判斷題：連綴動詞後面接補語時，應優先思考形容詞描述主詞狀態，而不是先用副詞修飾動詞嗎？

**參考答案**：1 A；2 是。`,

  grammar_svc_practice_bridge: `# SVC 練習前導讀：先定位補語，再談 -ly

## 例句
用同一個動詞感受「補語位置」：
- The results **look strong** on the chart.
- The results **look strongly** influenced…（第二句通常會改寫成不同結構；Part 5 常考的是第一句那種補語。）

## 識別信號
練習開始前，只要空格出現在 **look / seem / remain / appear / sound** 這類連綴動詞後面，就先問自己：**這裡是在描述主詞狀態嗎？** 若是，十之八九要走補語路線。

## 核心規則
做題順序建議：先判斷句子骨架，再選詞。不要第一步就找提示（hint）；提示留到真的卡住再用，才能訓練到應試時的判斷速度。

## 常見錯誤
- **陷阱模式**：看到選項有 -ly 就自動選副詞。
- **修正策略**：先確認空格是否為補語；若是，先把形容詞候選留下來再比對語意。

## 應試提示
Part 5 時間壓力大，請用「動詞類型 → 補語位置 → 詞性」三步驟，避免被形近字帶走；這套流程比死背規則更穩。

## 快速自測
1. 判斷題：SVC 練習中，看到 -ly 結尾就選，通常是安全策略嗎？
2. 判斷題：hint 應該在第一步就用，才能節省時間嗎？

**參考答案**：1 否；2 否。`,

  week1_day4_part6_bridge: `# Part 6 前導讀：段落語境比單句更關鍵

## 例句
Part 6 常見是「同一篇」裡多空格；請習慣用上下文決定語意：
- "The memo states that the rollout will pause **until** the vendor confirms the patch."
- 下一格可能接著考 **remain / seem / appear** 之類的補語，但必須與前後句一致。

## 識別信號
當題型要求你讀一整段（或兩三句以上）再選詞，就代表 **語境線索** 比單句文法更關鍵；這就是 Part 6 與 Part 5 的主要差異。

## 核心規則
先抓段落主題與態度（支持／反對／提醒／程序），再回到每個空格檢查詞性與搭配。SVC 在段落裡仍然成立，但要被整段語意約束。

## 常見錯誤
- **文法錯**：補語詞性選錯（形容詞／副詞混淆）。
- **語境錯**：文法看似可選，但與前後句主題不一致；請用「錯題檢討」分辨是哪一種。

## 應試提示
建議先用 20–30 秒掃過段落首句與轉折句，建立心中小地圖，再回頭填空格；這比逐格硬填更省時間。

## 快速自測
1. 判斷題：Part 6 可以完全不讀上下文，只用單句文法規則硬選嗎？
2. 判斷題：錯題時應先分辨是「文法規則錯」還是「語境判斷錯」嗎？

**參考答案**：1 否；2 是。`,

  grammar_svc_checkpoint_intro: `# Checkpoint 測驗說明：用一致規則檢驗學習成果

## 例句
你可以把 checkpoint 想成「把學過的規則放到時間壓力下」：
- "I'll complete each item **once**, under time pressure, **without hints**."
- "If I miss a grammar signal, I'll tag it for review after the run."

## 識別信號
看到系統標示 checkpoint／測驗／通過條件／限時，就代表進入「驗收模式」：規則與題幹讀題方式要和練習時一致，但提示工具通常會關閉。

## 核心規則
本次 checkpoint 預設：**不提供 hint**、**每題約 30 秒**、**一次作答**。通過條件以系統顯示為準：主題相關題正確率需達 **≥ 80%**，整體需 **≥ 70%**（若你本地規則不同，以畫面為準）。

## 常見錯誤
- **誤解**：以為一次沒過就代表能力不足。
- **正確理解**：未通過代表「訊號不足或節奏尚未內化」，回到練習與錯題複習即可。

## 應試提示
把 checkpoint 當成「弱點雷達」：通過很好；沒過也很有價值，因為你會得到下一輪練習的優先順序。

## 快速自測
1. 判斷題：checkpoint 的目的之一是找出還不穩的規則與讀題習慣嗎？
2. 判斷題：未通過時，最合理的下一步是放棄該主題並跳過所有複習嗎？

**參考答案**：1 是；2 否。`,

  grammar_svoo_core: `# 授與動詞（SVOO）：雙受詞與 to／for 介詞版

## 例句
- The PM **assigned the team** a new priority task.
- Please **forward the vendor** the updated spec sheet.
- She **sent her manager** the revised timeline.
- We **offered the client** a phased rollout plan.

## 識別信號
當動詞語意是「給出／傳遞／告知／分配」且同時出現「人」與「物」兩個受詞位置，就要先想：**這個動詞屬於授與動詞嗎？** 若是，常見骨架是 **V + 人 + 物**，也可改寫成 **V + 物 + 介詞 + 人**。

## 核心規則
授與動詞可接雙受詞（人＋物）。**give 類**：give 人 物 = give 物 **to** 人（不用 for）。**buy 類**：buy 人 物 = buy 物 **for** 人（不用 to）。Part 5 很愛考介詞搭配與詞序轉換。

## 常見錯誤
- **誤用 explain 當雙受詞動詞**：I explained him the issue.（不自然／不符合常見用法）
- **修正**：I **explained the issue to him**.（explain 後面常接「內容」，對象用 to 引導）

## 應試提示
先判斷動詞是否真能接「人＋物」雙受詞；若不行，就不要硬套雙受詞詞序，改用 to／for 或其他結構。

## 快速自測
1. 填空：She bought her colleague a coffee. → She bought a coffee _____ her colleague.（to／for 擇一）
2. 判斷題：give me the file 改寫成 give the file _____ me 時，介詞應該用 to 嗎？

**參考答案**：1 for；2 是。`,

  grammar_svoo_practice_bridge: `# SVOO 練習前導讀：先認動詞，再談詞序

## 例句
感受「兩個受詞」的節奏：
- They **told the interns** the safety guidelines.
- They **told the safety guidelines** to the interns.（介詞版）

## 識別信號
練習中若空格後面緊接兩個「名詞／名詞片語」角色（受益者＋內容物），而且動詞是 give／send／offer／show／assign／forward 這類，十之八九在考 **授與動詞與介詞搭配**。

## 核心規則
本次練習重點是 **辨認動詞類型**：能不能接雙受詞？要不要改成 to／for 介詞版？請避免只靠死背詞序，先用語意判斷「誰拿到什麼」。

## 常見錯誤
- **混淆轉換**：會背 give me the book，但一改成被動或介詞版就卡住。
- **修正**：練習時同時寫出兩種版本（雙受詞／介詞版），建立對應關係。

## 應試提示
先圈出人與物，再決定介詞 to 或 for；這比從左到右硬填更不容易掉入形近字陷阱。

## 快速自測
1. 判斷題：練習 SVOO 時，最重要的是先背熟所有動詞字母排列嗎？
2. 判斷題：介詞版（物＋介詞＋人）與雙受詞版（人＋物）之間，應能互相轉換理解嗎？

**參考答案**：1 否；2 是。`,

  week1_recap: `# Week 1 週末整理：SVC 與 SVOO 的地基

## 例句
把本週兩個核心放進同一段工作語境：
- The metrics **seem consistent**, and we **sent the stakeholders** a concise summary before noon.

## 識別信號
本週若你已能穩定判斷 **連綴動詞後的補語詞性**，以及 **授與動詞的人／物位置與 to／for**，你在 Part 5 的錯因會明顯變得更「可定位、可複習」。

## 核心規則
SVC 與 SVOO 都是高頻骨架：前者決定形容詞／副詞判斷，後者決定雙受詞與介詞搭配。週末複習請優先看錯題標籤，而不是重做整包。

## 常見錯誤
- **進度誤判**：以為沒通過 checkpoint 就代表本週白讀。
- **修正**：checkpoint 是驗收雷達；把錯因分類後回到練習，才是有效閉環。

## 應試提示
下週預告會進入 **Gerund（動名詞）** 與 **Participle（分詞）** 的判斷與位置配置；請先把本週錯題整理成「規則清單」，銜接會更順。

## 快速自測
1. 判斷題：本週學到的兩個主題，都是 Part 5 超高頻的句子骨架嗎？
2. 判斷題：合理的週末下一步是把錯題分類（文法／語境／搭配）再複習嗎？

**參考答案**：1 是；2 是。

**一句鼓勵**：你已經把最影響答題穩定度的兩條骨架建立起來；接下來每一週只是往同一套方法裡補零件，請照自己的節奏繼續累積。`,
};
