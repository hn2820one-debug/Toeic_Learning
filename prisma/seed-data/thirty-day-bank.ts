/**
 * 30-Day Closed-Loop question-bank seed (Priority 1 sample).
 *
 * Hand-authored to exercise the Reconciled v2 schema end-to-end:
 *   - primaryLearningSkillCode  → links into LearningSkill (58 rows)
 *   - coreRule, recognitionSignal, hint1/2/3
 *   - distractorAnalysisJson (per-choice taxonomy, see docs/teaching-quality-spec.md)
 *   - industryFocus = "semiconductor" where it fits the FSE voice
 *
 * This is a 24-row *demo seed*. The remaining Priority 1-4 items (to hit the
 * 400-question target in §6.4 of the plan) should be produced by the existing
 * gemini-generate + claude-verify pipeline with `targetSkillCode` wiring.
 */

export type DistractorInfo = {
  /** See docs/teaching-quality-spec.md — one of part_of_speech_error / tense_error /
   * collocation_error / register_error / form_confusion / near_synonym / false_friend /
   * plausible_wrong. */
  type: string;
  whyPlausible: string;
  whyWrong: string;
};

export type ThirtyDayBankItem = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;              // legacy display topic (free string)
  topicKey?: string;          // Phase1TopicKey when known
  skillKey?: string;          // coarse Phase1 skill (e.g. grammar.pattern-control)
  difficulty: "A" | "B" | "C";
  part: number;               // 5, 6, or 7
  primaryLearningSkillCode: string;
  coreRule: string;
  recognitionSignal: string;
  hint1: string;
  hint2: string;
  hint3: string;
  distractorAnalysis: {
    A?: DistractorInfo;
    B?: DistractorInfo;
    C?: DistractorInfo;
    D?: DistractorInfo;
  };
  industryFocus?: "semiconductor" | "medical" | "generic";
  registerLevel?: "formal" | "semi_formal" | "casual";
  sourceQuality: "seed";
};

// ─────────────────────────────────────────────
//  SVC — Subject-Verb-Complement (grammar_svc)
// ─────────────────────────────────────────────
const SVC_ITEMS: ThirtyDayBankItem[] = [
  {
    questionText:
      "The chamber pressure ______ stable throughout the overnight run, so we released the batch to production.",
    optionA: "remained",
    optionB: "remainedly",
    optionC: "to remain",
    optionD: "was remaining at",
    correctAnswer: "A",
    explanation:
      "`remain` 係典型 linking verb (SVC 句型)，後接形容詞作補語，唔需要副詞。`remained stable` = 保持穩定。",
    topic: "SVC · 連綴動詞",
    topicKey: "tech",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "Linking verb (seem / remain / become / appear / stay) 後接形容詞，唔係副詞。",
    recognitionSignal:
      "見到 remain / seem / become / appear / stay / feel + 空格 + adj/adv/n，十之八九考 SVC。",
    hint1: "呢條句型係 S + V(linking) + C。C 位要咩詞性？",
    hint2: "Linking verb 後接形容詞描述主語狀態，唔會接副詞。`remained stable` vs `remained stably`？",
    hint3: "正解結構：The pressure remained stable. ( stable 形容 pressure )",
    distractorAnalysis: {
      A: {
        type: "correct",
        whyPlausible: "最自然選擇；remain 喺 TOEIC 高頻連綴動詞。",
        whyWrong: "—",
      },
      B: {
        type: "part_of_speech_error",
        whyPlausible:
          "形式上似 adverb 修飾 verb，符合「動詞後接副詞」嘅錯誤直覺。",
        whyWrong:
          "`remainedly` 根本唔係英文字；而且 linking verb 唔需要副詞修飾其動作。",
      },
      C: {
        type: "form_confusion",
        whyPlausible: "to-infinitive 有「用嚟保持」嘅意思，但語法需要主要動詞。",
        whyWrong: "呢句 main clause 冇 finite verb，文法結構唔完整。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "was + V-ing 似係進行式，`at` 似有「停留喺某數值」意思。",
        whyWrong:
          "`remain` 做 linking verb 時本身就有持續意義，加 was -ing 令語義重疊；`remain at` 雖然可用，但後面應接具體數值，唔係 stable。",
      },
    },
    industryFocus: "semiconductor",
    registerLevel: "formal",
    sourceQuality: "seed",
  },
  {
    questionText:
      "After the calibration run, the output ______ cleaner than we expected.",
    optionA: "came up",
    optionB: "looked",
    optionC: "has looking",
    optionD: "is looked",
    correctAnswer: "B",
    explanation:
      "SVC 句型：`look + 形容詞` 表示「看起來 …」。`cleaner than we expected` 係形容詞比較級，當補語。",
    topic: "SVC · look + adj",
    topicKey: "tech",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "`look / sound / feel / taste / smell` + 形容詞 = SVC 感官連綴動詞。",
    recognitionSignal: "句中有比較級 adj（-er than / more ... than），空格前通常係 linking verb。",
    hint1: "空格後係一個形容詞比較級（cleaner）。邊個選項可以直接搭 adj？",
    hint2: "感官動詞 look / sound / feel 後接 adj 表示印象或狀態。",
    hint3: "The output looked cleaner. ( looked 連接 output 同 cleaner )",
    distractorAnalysis: {
      A: {
        type: "near_synonym",
        whyPlausible: "`came up` 有「呈現出」意思，語意上似合理。",
        whyWrong: "`come up + adj` 唔係標準搭配；`come up` 通常接 with 或做不及物動詞。",
      },
      B: { type: "correct", whyPlausible: "最自然嘅 linking verb 搭配。", whyWrong: "—" },
      C: {
        type: "tense_error",
        whyPlausible: "has + V-ing 看似現在完成進行式。",
        whyWrong: "正確結構係 has been looking，`has looking` 根本錯。",
      },
      D: {
        type: "form_confusion",
        whyPlausible: "被動語態 is + p.p. 看似合理。",
        whyWrong: "`look` 做感官動詞時唔用被動；`is looked` 語意唔通。",
      },
    },
    industryFocus: "semiconductor",
    sourceQuality: "seed",
  },
  {
    questionText:
      "Despite the firmware update, the alignment sensor still ______ unreliable during low-temperature cycles.",
    optionA: "proves",
    optionB: "proving",
    optionC: "proof",
    optionD: "is proved",
    correctAnswer: "A",
    explanation:
      "`prove + adj` 屬 SVC 句型，意即「結果顯示為」。第三人稱單數主語 sensor，動詞要加 s。",
    topic: "SVC · prove + adj",
    topicKey: "tech",
    skillKey: "grammar.pattern-control",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "`prove / turn out / become / grow + 形容詞` 表示經時間或測試呈現某狀態。",
    recognitionSignal: "固定結構：something + prove(s) + adj → SVC。",
    hint1: "主語係 `the sensor`，單複數？",
    hint2: "`prove` 喺此處係連綴動詞，唔需要 be 動詞輔助。",
    hint3: "The sensor proves unreliable. ( proves 當 linking verb )",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "結構同時態都正確。", whyWrong: "—" },
      B: {
        type: "form_confusion",
        whyPlausible: "V-ing 似做現在進行式。",
        whyWrong: "主句冇 be 動詞，V-ing 唔可以單獨做 main verb。",
      },
      C: {
        type: "part_of_speech_error",
        whyPlausible: "`proof` 同 `prove` 字形相近。",
        whyWrong: "`proof` 係名詞，不可當主要動詞。",
      },
      D: {
        type: "plausible_wrong",
        whyPlausible: "被動語態形式。",
        whyWrong: "`prove` 做連綴動詞時用主動；`be proved + adj` 通常需要 `to be` 連接。",
      },
    },
    industryFocus: "semiconductor",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The patient appeared ______ after the second dose, so the nurse advanced the schedule.",
    optionA: "comfortable",
    optionB: "comfortably",
    optionC: "comforting",
    optionD: "comfortless",
    correctAnswer: "A",
    explanation:
      "`appear + adj` 係 SVC。此處 `comfortable` (感到舒適) 形容 patient 嘅狀態；`comfortably` 係副詞，唔能搭 linking verb。",
    topic: "SVC · appear + adj",
    topicKey: "healthEnv",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "`appear + 形容詞` = 看起來；唔係 `appear + 副詞`。",
    recognitionSignal: "Linking verb (appear / seem) 後 99% 搭 adj。",
    hint1: "`appear` 喺此處當 linking verb。邊個選項係形容詞？",
    hint2: "副詞 -ly 唔會接 linking verb。",
    hint3: "The patient appeared comfortable. (舒適 = adj)",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "標準 SVC。", whyWrong: "—" },
      B: {
        type: "part_of_speech_error",
        whyPlausible: "-ly 副詞似修飾動詞 appear。",
        whyWrong: "Linking verb 後要 adj，唔要副詞。",
      },
      C: {
        type: "form_confusion",
        whyPlausible: "`comforting` = 令人感到安慰；結構似對。",
        whyWrong:
          "語意錯：係病人 feel comfortable，唔係病人 令人感到安慰 (`comforting`)。",
      },
      D: {
        type: "near_synonym",
        whyPlausible: "`comfortless` 係反義，形式係形容詞。",
        whyWrong: "語意同上文「推進療程」衝突；選 A 先合邏輯。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The marketing team remained ______ about the product launch despite the supply-chain warnings.",
    optionA: "optimism",
    optionB: "optimistically",
    optionC: "optimistic",
    optionD: "optimize",
    correctAnswer: "C",
    explanation:
      "`remain + adj` 係 SVC。`optimistic` 係形容詞；`optimism` 係名詞、`optimistically` 係副詞、`optimize` 係動詞，全部詞性錯。",
    topic: "SVC · remain + adj",
    topicKey: "marketing",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "Linking verb remain / stay 後接形容詞。",
    recognitionSignal: "`remain / stay / keep + ______ about / in / on` → 形容詞。",
    hint1: "4 個選項詞性唔同，揀啱形容詞。",
    hint2: "`optim-` 家族：名詞 / 副詞 / 形容詞 / 動詞各一。",
    hint3: "The team remained optimistic. (形容詞)",
    distractorAnalysis: {
      A: {
        type: "part_of_speech_error",
        whyPlausible: "同字根令人誤認。",
        whyWrong: "`optimism` 係名詞。Linking verb 後唔搭抽象名詞。",
      },
      B: {
        type: "part_of_speech_error",
        whyPlausible: "`-ly` 副詞形式完整。",
        whyWrong: "SVC 句型後要 adj，唔要 adv。",
      },
      C: { type: "correct", whyPlausible: "詞性正確。", whyWrong: "—" },
      D: {
        type: "part_of_speech_error",
        whyPlausible: "`optimize` 係動詞，詞根相同。",
        whyWrong: "已經有 `remained` 做 main verb，唔需要第二個動詞。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "Following the annual audit, the finance report ______ surprisingly thorough.",
    optionA: "was sounded",
    optionB: "sounded",
    optionC: "sounding",
    optionD: "sounds out",
    correctAnswer: "B",
    explanation:
      "`sound + adj` = 「聽起來 / 看似」，SVC 結構。過去式 sounded 對應 `following the annual audit` 時態。",
    topic: "SVC · sound + adj",
    topicKey: "finance",
    skillKey: "grammar.pattern-control",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_svc",
    coreRule: "`sound + adj` 係 SVC 感官連綴動詞；過去式唔加 be。",
    recognitionSignal: "時間片語 `following / after` 顯示過去動作，空格後係 adj 時想起 sound / look / seem。",
    hint1: "呢句需要過去式。邊個選項符合？",
    hint2: "`sound` 做連綴動詞時係主動，唔用被動。",
    hint3: "The report sounded thorough. ( 過去式主動 )",
    distractorAnalysis: {
      A: {
        type: "plausible_wrong",
        whyPlausible: "被動語態形式。",
        whyWrong: "`sound` 做感官連綴時唔用被動；`was sounded` 僅用喺「警報響起」等被動語境。",
      },
      B: { type: "correct", whyPlausible: "標準用法。", whyWrong: "—" },
      C: {
        type: "form_confusion",
        whyPlausible: "V-ing 可能以為係狀態。",
        whyWrong: "呢句需要 finite verb，V-ing 單獨唔可做主要動詞。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "`sound out` 係片語動詞。",
        whyWrong: "`sound out` 意即「試探意見」，搭配 adj 唔合邏輯。",
      },
    },
    industryFocus: "generic",
    sourceQuality: "seed",
  },
];

// ─────────────────────────────────────────────
//  SVOO — Ditransitive (grammar_svoo)
// ─────────────────────────────────────────────
const SVOO_ITEMS: ThirtyDayBankItem[] = [
  {
    questionText:
      "Please send ______ the updated wafer map before the end of the shift.",
    optionA: "the customer",
    optionB: "to the customer",
    optionC: "for the customer",
    optionD: "at the customer",
    correctAnswer: "A",
    explanation:
      "SVOO 結構：`send + 間接受詞 (人) + 直接受詞 (物)`。人 + 物 排列時唔需要介詞。",
    topic: "SVOO · send 人 物",
    topicKey: "coordination",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule:
      "SVOO: 主語 + V + 人 + 物（人同物直接排，冇介詞）；或 主語 + V + 物 + to/for + 人（有介詞）。",
    recognitionSignal:
      "動詞係 give / send / bring / offer / show / tell / lend / pay / teach / write，後面有「人 物」結構 = SVOO。",
    hint1: "`send the updated wafer map` 已經係「動詞 + 物」。空格位置應係咩？",
    hint2: "SVOO 結構：send + 人 + 物。排列順序係人喺前物喺後，中間冇介詞。",
    hint3: "Please send the customer the map. (人 = 間接受詞；map = 直接受詞)",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "SVOO 標準語序。", whyWrong: "—" },
      B: {
        type: "plausible_wrong",
        whyPlausible: "`send sth to sb` 亦正確語序；同義。",
        whyWrong:
          "但呢個語序需要調位：send the map to the customer。此句物已經喺後面（the updated wafer map），空格係介於 send 同物之間 — 呢個位置唔接 to。",
      },
      C: {
        type: "collocation_error",
        whyPlausible: "`for` 似乎表示「為咗客戶」。",
        whyWrong: "`send sth for sb` 意思唔同於「給」；send 同 give 一樣用 to 唔用 for。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "表示地點方向。",
        whyWrong: "`at` 表地點，唔用於授與對象。",
      },
    },
    industryFocus: "semiconductor",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The procurement officer offered ______ a 5% discount on repeat orders.",
    optionA: "to each vendor",
    optionB: "each vendor",
    optionC: "at each vendor",
    optionD: "for each vendor",
    correctAnswer: "B",
    explanation:
      "SVOO: offer + 間接受詞 + 直接受詞。此句物係 `a 5% discount`，人做間接受詞排喺前，唔用介詞。",
    topic: "SVOO · offer 人 物",
    topicKey: "coordination",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule: "offer + 人 + 物（冇介詞）；或 offer + 物 + to + 人（有介詞）。",
    recognitionSignal: "空格後係一個名詞片語（物），空格就是 OBJ 位；offer 係 SVOO 動詞之一。",
    hint1: "offer 屬於哪一類動詞？",
    hint2: "`offer 人 物` 唔用介詞，直接排。",
    hint3: "offered each vendor a 5% discount.",
    distractorAnalysis: {
      A: {
        type: "plausible_wrong",
        whyPlausible: "offer + to + 人亦正確。",
        whyWrong: "但此結構需要調順序為 offer a 5% discount to each vendor，唔係此處位置。",
      },
      B: { type: "correct", whyPlausible: "SVOO 語序。", whyWrong: "—" },
      C: {
        type: "collocation_error",
        whyPlausible: "`at` 表地點。",
        whyWrong: "`offer at` 唔係授與搭配。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "`offer for sb` 似「為某人而提供」。",
        whyWrong: "授與對象用 to 唔用 for。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "We bought ______ a new spectroscope to support the new etch process.",
    optionA: "the lab team",
    optionB: "to the lab team",
    optionC: "for the lab team",
    optionD: "of the lab team",
    correctAnswer: "A",
    explanation:
      "SVOO: `buy + 人 + 物` 或 `buy + 物 + for + 人`。此處人排喺物之前，唔用介詞。注意 buy / make / cook / find 用 `for`，give / send / offer 用 `to`。",
    topic: "SVOO · buy 人 物",
    topicKey: "tech",
    skillKey: "grammar.pattern-control",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule: "`buy / find / make / cook + 人 + 物` 或 `... + 物 + for + 人`（介詞用 for，唔係 to）。",
    recognitionSignal:
      "動詞係 buy / find / make / cook / get / prepare / save 家族 → 介詞用 for；動詞係 give / send / offer / show / tell 家族 → 介詞用 to。",
    hint1: "`buy` 嘅授與介詞係 `to` 定 `for`？",
    hint2: "但此句空格後直接係物（a spectroscope），所以空格位置應排「人」，唔用介詞。",
    hint3: "We bought the lab team a spectroscope. (人 + 物，冇介詞)",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "SVOO 語序。", whyWrong: "—" },
      B: {
        type: "collocation_error",
        whyPlausible: "`to` 係常見授與介詞。",
        whyWrong: "`buy` 嘅授與介詞係 `for` 唔係 `to`。",
      },
      C: {
        type: "plausible_wrong",
        whyPlausible: "`buy sth for sb` 完全正確。",
        whyWrong:
          "但呢個結構需要將物放喺介詞前：bought a spectroscope for the lab team — 此處物已喺空格後，語序唔合。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "`of` 係常見介詞。",
        whyWrong: "`buy of sb` 唔係授與搭配。",
      },
    },
    industryFocus: "semiconductor",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The senior engineer will teach ______ the new diagnostic workflow next Monday.",
    optionA: "to the interns",
    optionB: "for the interns",
    optionC: "the interns",
    optionD: "by the interns",
    correctAnswer: "C",
    explanation:
      "SVOO: teach + 人 + 物。此處人排喺物之前，唔用介詞。`teach sth to sb` 亦可，但語序要調。",
    topic: "SVOO · teach 人 物",
    topicKey: "hr",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule: "teach + 人 + 物 (冇介詞) 或 teach + 物 + to + 人。",
    recognitionSignal: "`teach sb sth` 最常見；TOEIC 考 ditransitive。",
    hint1: "teach 係 SVOO 動詞。人物順序？",
    hint2: "空格後係物 (workflow)，即空格係人嘅位置，直接排，冇介詞。",
    hint3: "will teach the interns the workflow.",
    distractorAnalysis: {
      A: {
        type: "plausible_wrong",
        whyPlausible: "`teach sth to sb` 正確。",
        whyWrong: "語序唔合 — 物未排，唔可直接 `to sb`。",
      },
      B: {
        type: "collocation_error",
        whyPlausible: "`for` 似授與。",
        whyWrong: "teach 用 `to` 唔用 `for`。",
      },
      C: { type: "correct", whyPlausible: "SVOO 標準。", whyWrong: "—" },
      D: {
        type: "plausible_wrong",
        whyPlausible: "`by` 係被動施事介詞。",
        whyWrong: "句子係主動結構，`by` 唔合。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "Could you please pass ______ the revised change-order form when it's ready?",
    optionA: "me",
    optionB: "to me",
    optionC: "for me",
    optionD: "at me",
    correctAnswer: "A",
    explanation:
      "SVOO: pass + 人 + 物。`pass me the form` 語序，人直接跟動詞後，中間冇介詞。",
    topic: "SVOO · pass 人 物",
    topicKey: "office",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule: "pass / hand / throw + 人 + 物；介詞式用 to。",
    recognitionSignal: "口語 / semi-formal request 常用 SVOO。",
    hint1: "pass 屬授與動詞 family 哪一邊？",
    hint2: "Could you pass me the salt? 就係 SVOO 典型例子。",
    hint3: "pass me the form.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "SVOO 語序。", whyWrong: "—" },
      B: {
        type: "plausible_wrong",
        whyPlausible: "pass sth to sb 亦對。",
        whyWrong: "但物未排前，唔可直接 `to me`。",
      },
      C: {
        type: "collocation_error",
        whyPlausible: "`for me` 係「為我」。",
        whyWrong: "pass 用 to 唔用 for。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "方向介詞。",
        whyWrong: "`at me` 唔係授與意思。",
      },
    },
    registerLevel: "semi_formal",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The HR manager sent ______ a formal offer letter within 48 hours.",
    optionA: "the candidate",
    optionB: "for the candidate",
    optionC: "about the candidate",
    optionD: "from the candidate",
    correctAnswer: "A",
    explanation:
      "SVOO: send + 人 + 物。此處物係 offer letter，人直接排喺 send 後。",
    topic: "SVOO · send 人 物",
    topicKey: "hr",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_svoo",
    coreRule: "send + 人 + 物 (無介詞)。",
    recognitionSignal: "`send` + 空格 + 物 → SVOO 結構。",
    hint1: "send 係 SVOO 動詞。",
    hint2: "人放前，物放後，中間冇介詞。",
    hint3: "sent the candidate a letter.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "SVOO。", whyWrong: "—" },
      B: {
        type: "collocation_error",
        whyPlausible: "`for` 表原因。",
        whyWrong: "send 用 to 唔用 for。",
      },
      C: {
        type: "collocation_error",
        whyPlausible: "`about` 表主題。",
        whyWrong: "授與對象唔用 about。",
      },
      D: {
        type: "collocation_error",
        whyPlausible: "`from` 表來源。",
        whyWrong: "方向倒轉；此句主動發送。",
      },
    },
    sourceQuality: "seed",
  },
];

// ─────────────────────────────────────────────
//  Baseline Diagnostic (8 items, 4 skills × 2)
//  Used by Day 1 baseline test
// ─────────────────────────────────────────────
const DIAGNOSTIC_ITEMS: ThirtyDayBankItem[] = [
  {
    questionText:
      "The board members were enthusiastic about ______ the new expansion plan.",
    optionA: "approve",
    optionB: "approved",
    optionC: "approving",
    optionD: "to approve",
    correctAnswer: "C",
    explanation:
      "介詞 `about` 後一定接 V-ing (動名詞)。`be enthusiastic about` 係固定搭配。",
    topic: "Gerund · 介詞後 V-ing",
    topicKey: "operations",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_gerund",
    coreRule: "介詞 (in / on / about / of / for / to) 之後一定要用 V-ing，唔好用 to V。",
    recognitionSignal: "見到 `be + adj + 介詞 + 空格` 結構，空格十之八九係動名詞。",
    hint1: "空格前係介詞 `about`。介詞後要咩形式？",
    hint2: "`be enthusiastic about + V-ing` 固定搭配。",
    hint3: "about approving the plan.",
    distractorAnalysis: {
      A: {
        type: "part_of_speech_error",
        whyPlausible: "原形動詞形式。",
        whyWrong: "介詞後唔用原形動詞。",
      },
      B: {
        type: "tense_error",
        whyPlausible: "過去式或過去分詞。",
        whyWrong: "介詞後唔接過去式。",
      },
      C: { type: "correct", whyPlausible: "介詞 + V-ing。", whyWrong: "—" },
      D: {
        type: "plausible_wrong",
        whyPlausible: "to V 似表目的。",
        whyWrong: "介詞 about 後唔用 to V；要用 V-ing。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "The team postponed ______ the new SOP until the compliance review is complete.",
    optionA: "to implement",
    optionB: "implementing",
    optionC: "implemented",
    optionD: "implement",
    correctAnswer: "B",
    explanation:
      "`postpone` 屬於只接 V-ing 嘅動詞（其他：avoid / consider / enjoy / mind / quit / finish / suggest / deny）。",
    topic: "Gerund · 特定動詞後 V-ing",
    topicKey: "operations",
    skillKey: "grammar.pattern-control",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_gerund",
    coreRule:
      "幾個高頻 TOEIC 動詞 (postpone / consider / avoid / enjoy / mind / quit / finish) 後必須用 V-ing。",
    recognitionSignal: "`postpone / consider / avoid + 空格` → 直接 V-ing。",
    hint1: "`postpone` 只接邊一種動詞形式？",
    hint2: "助記：APPEND C — Avoid / Postpone / Practice / Enjoy / Need attention... 答案係 V-ing。",
    hint3: "postponed implementing the SOP.",
    distractorAnalysis: {
      A: {
        type: "plausible_wrong",
        whyPlausible: "`to V` 似表目的。",
        whyWrong: "postpone 唔接 to V，只接 V-ing。",
      },
      B: { type: "correct", whyPlausible: "固定搭配。", whyWrong: "—" },
      C: {
        type: "tense_error",
        whyPlausible: "過去分詞可作被動。",
        whyWrong: "postpone 後需要主動 V-ing。",
      },
      D: {
        type: "part_of_speech_error",
        whyPlausible: "原形動詞。",
        whyWrong: "postpone 後唔用原形動詞。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "______ the client expected the delivery on Friday was clear from the email chain.",
    optionA: "That",
    optionB: "Which",
    optionC: "What",
    optionD: "Whom",
    correctAnswer: "A",
    explanation:
      "名詞子句做主語，用 `That` 引導（可理解為「某件事實」）。`Which / What / Whom` 都會改變句意或結構。",
    topic: "Noun Clause · 主語子句",
    topicKey: "coordination",
    skillKey: "grammar.sentence-linking",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_noun_clause",
    coreRule: "`That + 完整句子` 可做主語，意即「某件事」。Main verb 常係 was / is / became。",
    recognitionSignal: "主句動詞 is / was / became 前有一整個子句 → noun clause as subject。",
    hint1: "整個空格子句 (the client expected the delivery on Friday) 做主語。",
    hint2: "引導「某件事實」用 That。",
    hint3: "That the client expected Friday was clear.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "名詞子句主語引導詞。", whyWrong: "—" },
      B: {
        type: "form_confusion",
        whyPlausible: "`Which` 可引導子句。",
        whyWrong: "`Which` 需要指代前文名詞，此句冇前置詞。",
      },
      C: {
        type: "plausible_wrong",
        whyPlausible: "`What` 亦可引導名詞子句。",
        whyWrong: "但 `What + 不完整句` (what sb did) 先對；此句後面係完整句。",
      },
      D: {
        type: "form_confusion",
        whyPlausible: "`Whom` 引導子句。",
        whyWrong: "`Whom` 係關係代詞，需要指代人；語意唔合。",
      },
    },
    sourceQuality: "seed",
  },
  {
    questionText:
      "Please confirm ______ the new safety procedure applies to contractors as well.",
    optionA: "if",
    optionB: "whether",
    optionC: "that when",
    optionD: "which",
    correctAnswer: "B",
    explanation:
      "名詞子句做 confirm 嘅受詞；`whether` 表達「是否」。`if` 喺正式書面 TOEIC 情境較少當 noun clause 連詞，雖然口語可以。`that when` 語法上不成立。",
    topic: "Noun Clause · whether / if",
    topicKey: "notices",
    skillKey: "grammar.sentence-linking",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_noun_clause",
    coreRule:
      "做名詞子句 → 正式用 whether；做從句條件 (if it rains) → 用 if。TOEIC 正式語氣優先 whether。",
    recognitionSignal: "`confirm / ask / decide / know / wonder + 是否~` → 用 whether。",
    hint1: "此句係「確認是否 …」，正式用邊個連詞？",
    hint2: "`whether` 可做主語 / 受詞；`if` 通常只做受詞而且多用於口語。",
    hint3: "confirm whether the procedure applies.",
    distractorAnalysis: {
      A: {
        type: "register_error",
        whyPlausible: "`if` 可表「是否」(口語)。",
        whyWrong:
          "TOEIC 正式書面，confirm + 名詞子句時更傾向 `whether`。兩者有時互通但正式度有別。",
      },
      B: { type: "correct", whyPlausible: "正式名詞子句連詞。", whyWrong: "—" },
      C: {
        type: "plausible_wrong",
        whyPlausible: "`that when` 看似雙重連詞。",
        whyWrong: "語法錯；冇呢個結構。",
      },
      D: {
        type: "form_confusion",
        whyPlausible: "`which` 引導關係子句或名詞子句。",
        whyWrong: "`which` 需要二選一嘅情境或前置名詞；此句冇。",
      },
    },
    registerLevel: "formal",
    sourceQuality: "seed",
  },
  {
    questionText:
      "By the time the auditors arrived, we ______ all the ledger adjustments.",
    optionA: "already completed",
    optionB: "have already completed",
    optionC: "had already completed",
    optionD: "are already completing",
    correctAnswer: "C",
    explanation:
      "過去完成式 (had + p.p.) 表達「比過去某個時間更早完成」。此句 by the time ... arrived 已係過去時，動作在之前完成。",
    topic: "Past Perfect",
    topicKey: "finance",
    skillKey: "grammar.verb-control",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_past_perfect",
    coreRule: "`by the time + 過去式, 主句用 had + p.p.`",
    recognitionSignal: "`by the time` / `before` / `when` + 過去時間 → 主句可能用 past perfect。",
    hint1: "兩個過去時間點，邊個更早？用 had + p.p.。",
    hint2: "主句動作先發生，比 `arrived` 更早。",
    hint3: "had already completed the adjustments.",
    distractorAnalysis: {
      A: {
        type: "tense_error",
        whyPlausible: "過去式單純式。",
        whyWrong: "冇表達先後關係；TOEIC 考嘅就係時間差。",
      },
      B: {
        type: "tense_error",
        whyPlausible: "現在完成式。",
        whyWrong: "全句係過去語境，不應用 have + p.p.。",
      },
      C: { type: "correct", whyPlausible: "過去完成式。", whyWrong: "—" },
      D: {
        type: "tense_error",
        whyPlausible: "現在進行式。",
        whyWrong: "與 by the time + 過去 衝突。",
      },
    },
    industryFocus: "generic",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The procurement team replaced the defective parts ______ they received the RMA confirmation.",
    optionA: "until",
    optionB: "despite",
    optionC: "after",
    optionD: "because of",
    correctAnswer: "C",
    explanation:
      "`after + 子句` 表示先有 RMA confirmation，然後再 replace parts。其他選項語意或詞性唔合。",
    topic: "Conjunction · 時序",
    topicKey: "logistics",
    skillKey: "grammar.sentence-linking",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "grammar_conjunction",
    coreRule: "after / before / when + 完整子句 = 時序連接詞。",
    recognitionSignal: "空格後係完整子句 (S + V + O)，要揀從屬連接詞 (after / before / when / because)，唔揀介詞 (despite / because of)。",
    hint1: "空格後係完整子句 (they received...)。要連接詞定介詞？",
    hint2: "語意：先確認 RMA，再換零件 → after。",
    hint3: "after they received the confirmation.",
    distractorAnalysis: {
      A: {
        type: "near_synonym",
        whyPlausible: "`until` 係時間連接詞。",
        whyWrong: "`until` 表示「直到」，語意唔合。",
      },
      B: {
        type: "part_of_speech_error",
        whyPlausible: "`despite` 表讓步。",
        whyWrong: "`despite` 係介詞，後接名詞短語，唔接完整子句。",
      },
      C: { type: "correct", whyPlausible: "語意 + 詞性都對。", whyWrong: "—" },
      D: {
        type: "part_of_speech_error",
        whyPlausible: "`because of` 表原因。",
        whyWrong: "`because of` 係介詞片語，後接名詞，唔接子句。",
      },
    },
    industryFocus: "semiconductor",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The physician prescribed ______ medication for the ongoing respiratory issue.",
    optionA: "a powerful",
    optionB: "powerfully",
    optionC: "powerfulness",
    optionD: "powerfuller",
    correctAnswer: "A",
    explanation:
      "`medication` 係名詞，空格做修飾語要用形容詞 `powerful`。`a` 因 powerful 以子音開頭。",
    topic: "Vocabulary · Medical",
    topicKey: "healthEnv",
    skillKey: "vocabulary.domain-and-abstract-meaning",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "vocab_medical",
    coreRule: "空格後係名詞 → 揀形容詞；名詞 + noun 通常唔係典型 TOEIC 答案。",
    recognitionSignal: "`prescribed ______ medication` — 空格修飾 medication，詞性係 adj。",
    hint1: "空格後係名詞，位置係修飾語。要 adj。",
    hint2: "`powerful` 係形容詞；`powerfully` 係副詞。",
    hint3: "prescribed a powerful medication.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "adj + 名詞。", whyWrong: "—" },
      B: {
        type: "part_of_speech_error",
        whyPlausible: "-ly 副詞。",
        whyWrong: "副詞唔修飾名詞。",
      },
      C: {
        type: "part_of_speech_error",
        whyPlausible: "-ness 名詞。",
        whyWrong: "兩個名詞相連唔通。",
      },
      D: {
        type: "form_confusion",
        whyPlausible: "`powerfuller` 似比較級。",
        whyWrong: "Powerful 比較級係 more powerful，唔加 -er。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The research team is exploring ______ of renewable energy on regional ecosystems.",
    optionA: "the implication",
    optionB: "the implications",
    optionC: "a implications",
    optionD: "implication",
    correctAnswer: "B",
    explanation:
      "`implication` 係可數名詞，此句指多個（對多個生態系統嘅影響），要用複數 `implications`。",
    topic: "Noun · 可數名詞複數",
    topicKey: "healthEnv",
    skillKey: "grammar.pattern-control",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "grammar_nouns_count",
    coreRule: "`implication / impact / effect / concern / issue` 都係可數名詞，可以加複數 s。",
    recognitionSignal: "`the ______ of ... on ...` — 多個影響 → 複數名詞。",
    hint1: "Regional ecosystems (複數) → 對應多個影響 → 邊個選項？",
    hint2: "`implication` 係可數；此處用複數合語意。",
    hint3: "the implications of renewable energy.",
    distractorAnalysis: {
      A: {
        type: "plausible_wrong",
        whyPlausible: "單數形式亦可。",
        whyWrong: "但 regional ecosystems 係複數，用單數 implication 語意窄，考試傾向複數。",
      },
      B: { type: "correct", whyPlausible: "複數配多個生態。", whyWrong: "—" },
      C: {
        type: "form_confusion",
        whyPlausible: "`a implications` 冠詞錯誤。",
        whyWrong: "`a` 唔可接複數名詞；語法錯。",
      },
      D: {
        type: "form_confusion",
        whyPlausible: "冇冠詞形式。",
        whyWrong: "此句需要 the 做定冠詞；implication 作主題時需冠詞。",
      },
    },
    sourceQuality: "seed",
  },
];

// ─────────────────────────────────────────────
//  Vocab · Medical (4 demo items)
// ─────────────────────────────────────────────
const MEDICAL_VOCAB_ITEMS: ThirtyDayBankItem[] = [
  {
    questionText:
      "The oncologist adjusted the ______ after reviewing the latest blood test results.",
    optionA: "syllabus",
    optionB: "dosage",
    optionC: "protocol",
    optionD: "portrait",
    correctAnswer: "B",
    explanation:
      "`dosage` = 劑量，係醫療情境高頻詞。`protocol` 係治療方案（較抽象）；`syllabus` 係教學大綱、`portrait` 係肖像，都唔合。",
    topic: "Medical · dosage",
    topicKey: "healthEnv",
    skillKey: "vocabulary.domain-and-abstract-meaning",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "vocab_medical",
    coreRule: "高頻醫療詞：dosage / prescription / symptom / diagnosis / referral / chronic / acute。",
    recognitionSignal: "`血液檢驗結果 → 調整 ______` 語境 → 劑量 dosage。",
    hint1: "`dosage` 意思係？",
    hint2: "調整治療方案 protocol 亦合理，但 blood test + adjust 更對應劑量。",
    hint3: "adjusted the dosage.",
    distractorAnalysis: {
      A: {
        type: "near_synonym",
        whyPlausible: "-age 詞尾相似。",
        whyWrong: "`syllabus` 係教學大綱，同醫療無關。",
      },
      B: { type: "correct", whyPlausible: "正解。", whyWrong: "—" },
      C: {
        type: "plausible_wrong",
        whyPlausible: "`protocol` 係治療方案。",
        whyWrong:
          "語境上，血液檢驗結果直接對應嘅多係劑量調整，唔係整個 protocol。",
      },
      D: {
        type: "false_friend",
        whyPlausible: "`portrait` 同 `protocol` 字形相近。",
        whyWrong: "`portrait` 意思完全不同。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The clinic emphasizes early ______ to improve long-term outcomes.",
    optionA: "diagnosis",
    optionB: "diagnostics",
    optionC: "diagnose",
    optionD: "diagnosed",
    correctAnswer: "A",
    explanation:
      "`early + 名詞` 結構，要名詞。`diagnosis` 係單數名詞（複數 diagnoses），`diagnostics` 係形容詞/複數。",
    topic: "Medical · diagnosis",
    topicKey: "healthEnv",
    skillKey: "vocabulary.domain-and-abstract-meaning",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "vocab_medical",
    coreRule: "`diagnosis` (單數名詞), `diagnoses` (複數), `diagnostic` (形容詞), `diagnose` (動詞)。",
    recognitionSignal: "名詞 / 動詞 / 形容詞一組家族字 → 先判斷空格詞性。",
    hint1: "空格前係形容詞 early，空格後係 to V。要咩詞性？",
    hint2: "形容詞 + 名詞 + 不定詞；空格係名詞。",
    hint3: "early diagnosis (早期診斷).",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "名詞。", whyWrong: "—" },
      B: {
        type: "form_confusion",
        whyPlausible: "`diagnostics` 似名詞複數。",
        whyWrong:
          "通常指「診斷學 / 診斷工具」學科或複數；`early diagnostics` 唔係固定搭配。",
      },
      C: {
        type: "part_of_speech_error",
        whyPlausible: "動詞原形。",
        whyWrong: "形容詞 early 唔修飾動詞。",
      },
      D: {
        type: "part_of_speech_error",
        whyPlausible: "過去式 / 過去分詞。",
        whyWrong: "語境需要名詞，唔係分詞。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
  {
    questionText:
      "Patients with ______ conditions require regular follow-ups and medication adjustments.",
    optionA: "chronic",
    optionB: "acute",
    optionC: "chronicle",
    optionD: "chronically",
    correctAnswer: "A",
    explanation:
      "`chronic` (慢性) 適合持續性疾病，需要長期 follow-up。`acute` (急性) 通常短期劇烈；`chronicle` 係名詞「記事」；`chronically` 係副詞。",
    topic: "Medical · chronic vs acute",
    topicKey: "healthEnv",
    skillKey: "vocabulary.domain-and-abstract-meaning",
    difficulty: "B",
    part: 5,
    primaryLearningSkillCode: "vocab_medical",
    coreRule: "chronic = 慢性 / 長期；acute = 急性 / 短期劇烈。呢兩個係 TOEIC medical false friends。",
    recognitionSignal: "語境有 `regular follow-ups` 或 `long-term` → chronic；`sudden` / `severe` → acute。",
    hint1: "慢性定急性？看 `regular follow-ups`。",
    hint2: "chronic = 慢性，需要長期跟進。",
    hint3: "chronic conditions.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "慢性。", whyWrong: "—" },
      B: {
        type: "false_friend",
        whyPlausible: "同係描述疾病嚴重程度嘅 adj。",
        whyWrong: "`acute` 意思相反（急性），語意唔合長期 follow-up。",
      },
      C: {
        type: "form_confusion",
        whyPlausible: "字形相近。",
        whyWrong: "`chronicle` 係名詞（記事），詞性錯。",
      },
      D: {
        type: "part_of_speech_error",
        whyPlausible: "副詞形式。",
        whyWrong: "副詞唔修飾名詞 conditions。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
  {
    questionText:
      "The pharmacy called to remind us that the ______ for the blood pressure medication has expired.",
    optionA: "prescription",
    optionB: "presentation",
    optionC: "prescribe",
    optionD: "preservation",
    correctAnswer: "A",
    explanation:
      "`prescription` = 處方（文件 / 授權）。`presentation` 係演示、`preservation` 係保存、`prescribe` 係動詞。",
    topic: "Medical · prescription",
    topicKey: "healthEnv",
    skillKey: "vocabulary.domain-and-abstract-meaning",
    difficulty: "A",
    part: 5,
    primaryLearningSkillCode: "vocab_medical",
    coreRule: "prescription (處方箋/文件) vs prescribe (動詞開藥)。",
    recognitionSignal: "語境有 `pharmacy / medication / refill / expire` → prescription。",
    hint1: "藥房打電話話 ______ 過期。係咩文件？",
    hint2: "`prescription` = 處方箋。",
    hint3: "the prescription has expired.",
    distractorAnalysis: {
      A: { type: "correct", whyPlausible: "對應藥房情境。", whyWrong: "—" },
      B: {
        type: "false_friend",
        whyPlausible: "pre- 開頭嘅名詞。",
        whyWrong: "`presentation` 係演示，同藥物無關。",
      },
      C: {
        type: "part_of_speech_error",
        whyPlausible: "同根動詞。",
        whyWrong: "空格需要名詞，唔係動詞。",
      },
      D: {
        type: "false_friend",
        whyPlausible: "pre- 開頭嘅名詞。",
        whyWrong: "`preservation` 係保存，同醫藥使用場景無關。",
      },
    },
    industryFocus: "medical",
    sourceQuality: "seed",
  },
];

export const THIRTY_DAY_BANK_SEED: ThirtyDayBankItem[] = [
  ...SVC_ITEMS,
  ...SVOO_ITEMS,
  ...DIAGNOSTIC_ITEMS,
  ...MEDICAL_VOCAB_ITEMS,
];

if (THIRTY_DAY_BANK_SEED.length !== 24) {
  throw new Error(
    `THIRTY_DAY_BANK_SEED expected 24 items, got ${THIRTY_DAY_BANK_SEED.length}`,
  );
}
