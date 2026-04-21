import type { Phase1TopicKey } from "@/content/programs/phase1/types";

/** Stable ids for Week 1 lesson capsules (CLI `--unit=`). */
export type Week1LessonUnitId =
  | "week1_day1_baseline_intro"
  | "grammar_svc_core"
  | "grammar_svc_practice_bridge"
  | "week1_day4_part6_bridge"
  | "grammar_svc_checkpoint_intro"
  | "grammar_svoo_core"
  | "grammar_svoo_practice_bridge"
  | "week1_recap";

export type Week1LessonKind = "intro" | "concept" | "bridge" | "recap";

export type Week1LessonUnitSpec = {
  unit: Week1LessonUnitId;
  topicKey: Phase1TopicKey;
  lessonType: Week1LessonKind;
  estimatedReadMins: number;
  titleZh: string;
  titleEn: string;
  lessonIndex: number;
  /** Short bullets for LLM prompt grounding (Traditional Chinese). */
  teachingBulletsZh: string[];
};

/** Canonical order and DB `lessonIndex` (1–8) under `phase1-week1-lessons` moduleKey. */
export const WEEK1_LESSON_UNIT_SPECS: readonly Week1LessonUnitSpec[] = [
  {
    unit: "week1_day1_baseline_intro",
    topicKey: "onboarding",
    lessonType: "intro",
    estimatedReadMins: 3,
    titleZh: "Day 1 起點說明",
    titleEn: "Day 1 baseline intro",
    lessonIndex: 1,
    teachingBulletsZh: [
      "今天不是「一次定生死」的考試心態，而是建立學習起點與診斷資料。",
      "完成約 20 題後，系統會依結果產出個人化複習路徑。",
      "答不出來沒關係；如實作答才能讓推薦準確。",
    ],
  },
  {
    unit: "grammar_svc_core",
    topicKey: "grammar_svc",
    lessonType: "concept",
    estimatedReadMins: 6,
    titleZh: "連綴動詞（SVC）核心規則",
    titleEn: "Linking verbs (SVC) core",
    lessonIndex: 2,
    teachingBulletsZh: [
      "連綴動詞後面接形容詞補語，不要誤用副詞來修飾動詞本身。",
      "識別信號：sound / appear / remain / seem / become / stay / look。",
      "常見錯誤：sounds clearly → sounds clear；要搭配 TOEIC Part 5 快速判斷。",
      "例句需含半導體／工程師場景（sensor、firmware、yield 等）。",
    ],
  },
  {
    unit: "grammar_svc_practice_bridge",
    topicKey: "grammar_svc",
    lessonType: "bridge",
    estimatedReadMins: 3,
    titleZh: "SVC 練習前導讀",
    titleEn: "Before SVC practice",
    lessonIndex: 3,
    teachingBulletsZh: [
      "做題前先問：空格後是不是補語位置？",
      "陷阱：見到 -ly 結尾就選副詞。",
      "提示（hint）留到真的卡住再用。",
    ],
  },
  {
    unit: "week1_day4_part6_bridge",
    topicKey: "onboarding",
    lessonType: "bridge",
    estimatedReadMins: 3,
    titleZh: "Part 6 前導讀",
    titleEn: "Before Part 6",
    lessonIndex: 4,
    teachingBulletsZh: [
      "Part 6 要先讀上下文再選答案，不像 Part 5 以單句為主。",
      "SVC 會出現在段落語境中。",
      "錯題要分辨：是文法錯，還是語境判斷錯。",
    ],
  },
  {
    unit: "grammar_svc_checkpoint_intro",
    topicKey: "grammar_svc",
    lessonType: "intro",
    estimatedReadMins: 2,
    titleZh: "Checkpoint 測驗說明",
    titleEn: "Checkpoint test intro",
    lessonIndex: 5,
    teachingBulletsZh: [
      "Checkpoint：無 hint、每題約 30 秒、一次作答。",
      "通過條件：主題相關題正確率 ≥ 80%，整體 ≥ 70%。",
      "未通過不等於失敗，返回練習鞏固即可。",
    ],
  },
  {
    unit: "grammar_svoo_core",
    topicKey: "grammar_svoo",
    lessonType: "concept",
    estimatedReadMins: 6,
    titleZh: "授與動詞（SVOO）核心規則",
    titleEn: "Ditransitive verbs (SVOO) core",
    lessonIndex: 6,
    teachingBulletsZh: [
      "授與動詞可接雙受詞：人＋物。常見：give / send / offer / tell / show / assign / forward。",
      "give 人 物 = give 物 to 人（不要用 for）；buy 人 物 = buy 物 for 人（不要用 to）。",
      "explain 不是授與動詞，不能直接接雙受詞。",
    ],
  },
  {
    unit: "grammar_svoo_practice_bridge",
    topicKey: "grammar_svoo",
    lessonType: "bridge",
    estimatedReadMins: 3,
    titleZh: "SVOO 練習前導讀",
    titleEn: "Before SVOO practice",
    lessonIndex: 7,
    teachingBulletsZh: [
      "快速判斷：空格後會不會連續出現兩個名詞片語？",
      "介詞版（物＋to／for＋人）與雙受詞版的轉換。",
      "重點是辨認動詞類型，不是死背。",
    ],
  },
  {
    unit: "week1_recap",
    topicKey: "onboarding",
    lessonType: "recap",
    estimatedReadMins: 4,
    titleZh: "Week 1 週末整理",
    titleEn: "Week 1 recap",
    lessonIndex: 8,
    teachingBulletsZh: [
      "本週重點：SVC 與 SVOO，兩者喺 Part 5 出現頻率極高。",
      "預期進度：SVC 應已進入 Tested；SVOO 應已 Practiced。",
      "下週預告：Gerund（動名詞）／Participle（分詞）。",
      "一句具體鼓勵，避免空洞稱讚。",
    ],
  },
];

export const WEEK1_LESSON_MODULE_KEY = "phase1-week1-lessons" as const;
