import Link from "next/link";

import ContentClassificationStrip from "@/components/learning/ContentClassificationStrip";
import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { loadSessionClassificationStrip } from "@/lib/learning-session-classification-strip";
import { getTestPageView } from "@/lib/test-page-loader";
import { primaryButtonClass } from "@/lib/ui/form-classes";
import { defaultPrimaryLearningSkillForTopic } from "@/lib/topic-default-skill";

import { resolveTestQuestionCount } from "@/lib/test/resolve-test-count";

import TestSessionClient, { TestStartClient, type TestStartPreset } from "./TestSessionClient";

export const dynamic = "force-dynamic";

type TestPageProps = {
  searchParams?: {
    topicKey?: string;
    topic?: string;
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

export default async function TestPage({ searchParams }: TestPageProps) {
  const sp = searchParams;
  const topicKey = parseTopicKey(
    typeof sp?.topicKey === "string" ? sp.topicKey : typeof sp?.topic === "string" ? sp.topic : undefined,
  );
  const sessionId = typeof sp?.session === "string" ? sp.session : undefined;
  const pos = Number.parseInt(typeof sp?.pos === "string" ? sp.pos : "0", 10) || 0;
  const mode = typeof sp?.mode === "string" ? sp.mode : undefined;
  const skill = typeof sp?.skill === "string" ? sp.skill : undefined;
  const moduleKey = typeof sp?.moduleKey === "string" ? sp.moduleKey : undefined;
  const countParsed = Number.parseInt(typeof sp?.count === "string" ? sp.count : "", 10);
  const countParam = Number.isFinite(countParsed) ? countParsed : undefined;
  const targetCount = resolveTestQuestionCount(mode, countParam);
  const startPreset: TestStartPreset = {
    mode,
    skill,
    moduleKey,
    count: countParam,
  };
  const isCheckpoint = mode === "checkpoint";
  const skillRequiredButMissing = isCheckpoint && !skill?.trim();
  const stripSkillCode =
    topicKey != null ? (skill?.trim() ? skill : defaultPrimaryLearningSkillForTopic(topicKey)) : undefined;

  const testStrip =
    topicKey != null
      ? await loadSessionClassificationStrip({
          topicKey,
          skillCode: stripSkillCode,
          moduleKey,
          mode: "test",
        })
      : null;

  if (!topicKey) {
    return (
      <div>
        <BilingualHeading
          titleZh="驗收"
          titleEn="Test"
          descriptionZh="請帶入 topicKey；checkpoint 可加 mode/skill，例如 /test?topicKey=office&mode=checkpoint&skill=grammar_svc&count=15。"
          descriptionEn="Use ?topicKey=…; checkpoint: ?mode=checkpoint&skill=…&count=…"
        />
        <AppCard padding="md">
          <Link href="/learn" className="font-semibold text-primary-700 underline">
            前往今日學習 · Go to /learn
          </Link>
        </AppCard>
      </div>
    );
  }

  const view = await getTestPageView({
    topicKey: typeof sp?.topicKey === "string" ? sp.topicKey : undefined,
    topicAlias: typeof sp?.topic === "string" ? sp.topic : undefined,
    sessionId,
    pos,
    mode,
    skill,
    moduleKey,
    count: countParam,
  });

  if (view.kind === "no_user") {
    return (
      <div>
        <BilingualHeading titleZh="驗收" titleEn="Test" descriptionZh="" descriptionEn="" />
        <AppCard className="border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-950">需要學習者帳號才能寫入驗收紀錄。</p>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "not_ready") {
    return (
      <div>
        <BilingualHeading
          titleZh="驗收"
          titleEn="Test"
          descriptionZh="需先完成腳手架練習並達到 Practiced 階段，才能進行限時驗收。"
          descriptionEn="Complete scaffolded practice first (stage Practiced)."
        />
        {testStrip ? <ContentClassificationStrip strip={testStrip} className="mb-4" /> : null}
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="mt-2 text-xs">
            目前階段 · Stage: {view.stage ?? "（無紀錄）"} · {view.reason === "no_progress_row" ? "尚無主題進度" : "未達 Practiced"}
          </p>
        </div>
        <AppCard padding="md">
          <Link
            href={`/practice?topicKey=${encodeURIComponent(view.topicKey)}&mode=lesson_drill&skill=${encodeURIComponent(defaultPrimaryLearningSkillForTopic(view.topicKey))}`}
            className={primaryButtonClass}
          >
            前往練習 · Go to practice
          </Link>
          <div className="mt-4">
            <Link href={`/learn/${encodeURIComponent(view.topicKey)}`} className="text-sm font-semibold text-slate-700 underline">
              回主題學習
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "ready") {
    return (
      <div>
        <BilingualHeading
          titleZh="限時驗收"
          titleEn="Timed checkpoint"
          descriptionZh={`無提示、無重試；約 ${targetCount} 題 · 每題 30s · 逾時計錯。可用 ?mode=checkpoint&skill=… 雙軸揀題。通過後 Practiced → Tested。`}
          descriptionEn={`~${targetCount} items · 30s each. Optional ?mode=checkpoint&skill=…. Pass promotes to Tested.`}
        />
        {testStrip ? <ContentClassificationStrip strip={testStrip} className="mb-6" /> : null}
        {skillRequiredButMissing ? (
          <AppCard padding="md" className="mb-4 border-amber-300 bg-amber-50/95">
            <p className="text-sm font-semibold text-amber-950">缺少 primary skill（URL）</p>
            <p className="mt-1 text-sm text-amber-900/95">
              <code className="rounded bg-amber-100 px-1">mode=checkpoint</code> 必須搭配{" "}
              <code className="rounded bg-amber-100 px-1">skill=</code>
              （與教材 primaryLearningSkillCode 一致）。分類條上的 skill 僅為主題預設示意。
            </p>
            <Link
              href={`/learn/${encodeURIComponent(view.topicKey)}?primaryLearningSkillCode=${encodeURIComponent(defaultPrimaryLearningSkillForTopic(view.topicKey))}`}
              className="mt-3 inline-block text-sm font-semibold text-primary-800 underline"
            >
              回教材頁（帶入 skill）
            </Link>
          </AppCard>
        ) : null}
        <AppCard padding="md" className="mb-6 border-violet-200/70 bg-violet-50/50">
          <p className="text-sm font-semibold text-violet-950">2 分鐘熱身（建議）</p>
          <p className="mt-1 text-sm text-violet-900/90">
            不影響驗收分數；先讓大腦進入狀態再開始限時測驗。可略過。
          </p>
          <Link
            href={`/warmup?topicKey=${encodeURIComponent(view.topicKey)}&flow=test`}
            className="mt-3 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800"
          >
            前往熱身 · Warm-up first
          </Link>
        </AppCard>
        <AppCard padding="md">
          {view.resumeCandidate ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-semibold">偵測到未完成驗收</p>
              <div className="mt-1">
                <Link
                  href={(() => {
                    const rq = new URLSearchParams();
                    rq.set("topicKey", view.topicKey);
                    rq.set("session", view.resumeCandidate.sessionId);
                    rq.set("pos", "0");
                    if (mode) {
                      rq.set("mode", mode);
                    }
                    if (skill) {
                      rq.set("skill", skill);
                    }
                    if (moduleKey) {
                      rq.set("moduleKey", moduleKey);
                    }
                    if (countParam != null) {
                      rq.set("count", String(countParam));
                    }
                    return `/test?${rq.toString()}`;
                  })()}
                  className="font-semibold underline"
                >
                  先接續舊場次
                </Link>
              </div>
            </div>
          ) : null}
          <TestStartClient topicKey={view.topicKey} preset={startPreset} disabled={skillRequiredButMissing} />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/practice?topicKey=${encodeURIComponent(view.topicKey)}`}
              className="text-sm font-semibold text-slate-700 underline underline-offset-4"
            >
              回練習 · Practice
            </Link>
            <Link href={`/learn/${encodeURIComponent(view.topicKey)}`} className="text-sm font-semibold text-slate-700 underline underline-offset-4">
              主題學習 · Learn topic
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "session") {
    const sessionTestStrip = await loadSessionClassificationStrip({
      topicKey: view.topicKey,
      skillCode: skill?.trim() ? skill : defaultPrimaryLearningSkillForTopic(view.topicKey),
      moduleKey,
      mode: "test",
    });
    if (view.status === "abandoned") {
      return (
        <div>
          <BilingualHeading titleZh="驗收" titleEn="Test" descriptionZh="" descriptionEn="" />
          <TestSessionClient
            topicKey={view.topicKey}
            label={view.label}
            sessionId={view.sessionId}
            status="abandoned"
            questions={[]}
            initialPos={0}
            itemStatesJson={[]}
            secondsPerQuestion={30}
          />
        </div>
      );
    }

    return (
      <div>
        <BilingualHeading
          titleZh="限時驗收"
          titleEn="Timed checkpoint"
          descriptionZh={
            view.status === "completed"
              ? "本場次已完成；下方為成績與逐題檢討。"
              : "測驗進行中：請勿使用提示，每題單次作答。"
          }
          descriptionEn={view.status === "completed" ? "Run finished — results below." : "In progress — single attempt per item."}
        />
        <ContentClassificationStrip strip={sessionTestStrip} className="mb-4" />
        <TestSessionClient
          topicKey={view.topicKey}
          label={view.label}
          sessionId={view.sessionId}
          status={view.status}
          questions={view.questions}
          initialPos={view.currentPosition}
          itemStatesJson={view.itemStatesJson}
          secondsPerQuestion={view.secondsPerQuestion}
          resultSummary={view.resultSummary}
          compositionWarnings={view.compositionWarnings}
          nextStep={view.nextStep}
        />
      </div>
    );
  }

  return null;
}
