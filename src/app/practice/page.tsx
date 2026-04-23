import Link from "next/link";

import ContentClassificationStrip from "@/components/learning/ContentClassificationStrip";
import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import PredictionPreferenceToggle from "@/components/practice/PredictionPreferenceToggle";
import { loadSessionClassificationStrip } from "@/lib/learning-session-classification-strip";
import { getPracticePageView } from "@/lib/practice/practice-page-loader";
import { resolvePracticeQuestionCount } from "@/lib/practice/resolve-practice-count";
import { defaultPrimaryLearningSkillForTopic } from "@/lib/topic-default-skill";

import PracticeSessionClient, { PracticeStartClient, type PracticeStartPreset } from "./PracticeSessionClient";

export const dynamic = "force-dynamic";

type PracticePageProps = {
  searchParams?: {
    topicKey?: string;
    session?: string;
    pos?: string;
    mode?: string;
    skill?: string;
    moduleKey?: string;
    count?: string;
  };
};

function parseTopicKey(raw: string | undefined): Phase1TopicKey | null {
  if (!raw) {
    return null;
  }
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(raw) ? (raw as Phase1TopicKey) : null;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const sp = searchParams;
  const topicKey = parseTopicKey(typeof sp?.topicKey === "string" ? sp.topicKey : undefined);
  const sessionId = typeof sp?.session === "string" ? sp.session : undefined;
  const pos = Number.parseInt(typeof sp?.pos === "string" ? sp.pos : "0", 10) || 0;
  const mode = typeof sp?.mode === "string" ? sp.mode : undefined;
  const skill = typeof sp?.skill === "string" ? sp.skill : undefined;
  const moduleKey = typeof sp?.moduleKey === "string" ? sp.moduleKey : undefined;
  const countParsed = Number.parseInt(typeof sp?.count === "string" ? sp.count : "", 10);
  const countParam = Number.isFinite(countParsed) ? countParsed : undefined;
  const isGuided =
    mode === "lesson_drill" || mode === "mixed_practice" || Boolean(skill?.trim());
  const targetQuestionCount = resolvePracticeQuestionCount(
    isGuided ? mode : undefined,
    isGuided ? countParam : undefined,
  );
  const startPreset: PracticeStartPreset = {
    mode,
    skill,
    moduleKey,
    count: isGuided ? countParam : undefined,
    targetQuestionCount,
    isGuided,
  };

  if (!topicKey) {
    return (
      <div>
        <BilingualHeading
          titleZh="練習"
          titleEn="Practice"
          descriptionZh="請從「今日學習」或主題連結帶入 topicKey；引導練習可加 mode／skill，例如 /practice?topicKey=office&mode=lesson_drill&skill=grammar_svc&count=7。"
          descriptionEn="Use ?topicKey=…; guided drill can add mode/skill, e.g. …&mode=lesson_drill&skill=grammar_svc&count=7."
        />
        <AppCard padding="md">
          <Link href="/learn" className="font-semibold text-primary-700 underline">
            前往今日學習 · Go to /learn
          </Link>
        </AppCard>
      </div>
    );
  }

  const skillRequiredButMissing = isGuided && !skill?.trim();
  const stripSkillCode = skill?.trim() ? skill : defaultPrimaryLearningSkillForTopic(topicKey);

  const practiceStrip = await loadSessionClassificationStrip({
    topicKey,
    skillCode: stripSkillCode,
    moduleKey,
    mode: "practice",
  });

  const view = await getPracticePageView({ topicKey, sessionId, pos });

  if (view.kind === "no_user") {
    return (
      <div>
        <BilingualHeading titleZh="練習" titleEn="Practice" descriptionZh="" descriptionEn="" />
        <AppCard className="border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-950">需要學習者帳號才能寫入練習紀錄。</p>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "ready") {
    return (
      <div>
        <BilingualHeading
          titleZh={isGuided ? "引導練習 · 雙軸題庫" : "腳手架練習"}
          titleEn={isGuided ? "Guided dual-axis practice" : "Scaffolded practice"}
          descriptionZh={
            isGuided
              ? skill?.trim()
                ? `按 primary skill 優先揀題（約 ${targetQuestionCount} 題）；有提示、可重試。引導／lesson_drill 模式下不會用「同主題但不同 skill」的題目補滿。`
                : `按技能／主題揀題（約 ${targetQuestionCount} 題）；有提示、可重試，不計正式戰績。mixed_practice 仍可能放寬選題。`
              : "有提示、可重試，不計正式戰績。預設 10 題（非引導模式不保證單一 skill strict）。"
          }
          descriptionEn={
            isGuided
              ? skill?.trim()
                ? `Skill-first selection (~${targetQuestionCount}). Guided modes avoid wrong-skill backfill.`
                : `Skill/topic-aware selection (~${targetQuestionCount} items). mixed_practice may still widen the pool.`
              : "Hints and retries; does not update ELO. Default 10 items; non-guided selection is not strict single-skill."
          }
        />
        <ContentClassificationStrip strip={practiceStrip} className="mb-6" />
        {skillRequiredButMissing ? (
          <AppCard padding="md" className="mb-4 border-amber-300 bg-amber-50/95">
            <p className="text-sm font-semibold text-amber-950">缺少 primary skill（URL）</p>
            <p className="mt-1 text-sm text-amber-900/95">
              引導練習必須帶 <code className="rounded bg-amber-100 px-1">skill=</code>（與教材 primaryLearningSkillCode
              一致）。上方分類條僅以主題預設 skill 顯示示意，不會代替正式參數。
            </p>
            <Link
              href={`/learn/${encodeURIComponent(topicKey)}?primaryLearningSkillCode=${encodeURIComponent(stripSkillCode)}`}
              className="mt-3 inline-block text-sm font-semibold text-primary-800 underline"
            >
              回教材頁（帶入 skill）· Back to learn with skill
            </Link>
          </AppCard>
        ) : null}
        <AppCard padding="md" className="mb-6 border-violet-200/70 bg-violet-50/50">
          <p className="text-sm font-semibold text-violet-950">2 分鐘熱身（建議）</p>
          <p className="mt-1 text-sm text-violet-900/90">
            不是正式練習成績，只為喚醒最近學過／錯過的線索。可略過。
          </p>
          <Link
            href={`/warmup?topicKey=${encodeURIComponent(topicKey)}&flow=practice`}
            className="mt-3 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800"
          >
            前往熱身 · Warm-up first
          </Link>
        </AppCard>
        <AppCard padding="md">
          <div className="mb-4 flex justify-end">
            <PredictionPreferenceToggle />
          </div>
          {view.resumeCandidate ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-semibold">偵測到未完成練習</p>
              <p className="mt-1">你可以接續未完成場次，或重新開始一場新練習。</p>
              <div className="mt-2">
                <Link
                  href={`/practice?topicKey=${encodeURIComponent(topicKey)}&session=${encodeURIComponent(view.resumeCandidate.sessionId)}&pos=0`}
                  className="font-semibold underline"
                >
                  接續未完成場次
                </Link>
              </div>
            </div>
          ) : null}
          <PracticeStartClient topicKey={topicKey} preset={startPreset} disabled={skillRequiredButMissing} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/learn/${encodeURIComponent(topicKey)}`}
              className="text-sm font-semibold text-slate-700 underline underline-offset-4"
            >
              回主題學習 · Back to learn
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "session") {
    const sessionStrip = await loadSessionClassificationStrip({
      topicKey: view.topicKey,
      skillCode: view.practiceRuntime?.skill ?? skill,
      moduleKey: view.practiceRuntime?.moduleKey ?? moduleKey,
      mode: "practice",
    });
    if (view.status === "abandoned") {
      return (
        <div>
          <BilingualHeading titleZh="練習" titleEn="Practice" descriptionZh="" descriptionEn="" />
          <AppCard>此場次已放棄。請重新開始。</AppCard>
          <PracticeStartClient topicKey={view.topicKey} preset={startPreset} disabled={skillRequiredButMissing} />
        </div>
      );
    }

    return (
      <div>
        <BilingualHeading
          titleZh="腳手架練習"
          titleEn="Scaffolded practice"
          descriptionZh={`${view.label} — 非測驗；請分開使用「看提示」與選項作答。`}
          descriptionEn="Not a test — hints are separate from answering."
        />
        <ContentClassificationStrip strip={sessionStrip} className="mb-4" />
        <PracticeSessionClient
          topicKey={view.topicKey}
          label={view.label}
          sessionId={view.sessionId}
          status={view.status}
          questions={view.questions}
          initialPos={view.currentPosition}
          itemStatesJson={view.itemStatesJson}
          practiceRuntime={view.practiceRuntime}
          completedSummary={view.completedSummary}
          nextStep={view.nextStep}
        />
      </div>
    );
  }

  return null;
}
