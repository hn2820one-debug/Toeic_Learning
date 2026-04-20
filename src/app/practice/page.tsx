import Link from "next/link";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import PredictionPreferenceToggle from "@/components/practice/PredictionPreferenceToggle";
import { getPracticePageView } from "@/lib/practice/practice-page-loader";

import PracticeSessionClient, { PracticeStartClient } from "./PracticeSessionClient";

export const dynamic = "force-dynamic";

type PracticePageProps = {
  searchParams?: { topicKey?: string; session?: string; pos?: string };
};

function parseTopicKey(raw: string | undefined): Phase1TopicKey | null {
  if (!raw) {
    return null;
  }
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(raw) ? (raw as Phase1TopicKey) : null;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const topicKey = parseTopicKey(
    typeof searchParams?.topicKey === "string" ? searchParams.topicKey : undefined,
  );
  const sessionId = typeof searchParams?.session === "string" ? searchParams.session : undefined;
  const pos = Number.parseInt(typeof searchParams?.pos === "string" ? searchParams.pos : "0", 10) || 0;

  if (!topicKey) {
    return (
      <div>
        <BilingualHeading
          titleZh="練習"
          titleEn="Practice"
          descriptionZh="請從「今日學習」或主題連結帶入 topicKey，例如 /practice?topicKey=office。"
          descriptionEn="Open with ?topicKey=… from Today’s learning or a topic link."
        />
        <AppCard padding="md">
          <Link href="/learn" className="font-semibold text-primary-700 underline">
            前往今日學習 · Go to /learn
          </Link>
        </AppCard>
      </div>
    );
  }

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
          titleZh="腳手架練習"
          titleEn="Scaffolded practice"
          descriptionZh="有提示、可重試，不計正式戰績。預設 10 題（題量不足時會自動降級選題）。"
          descriptionEn="Hints and retries; does not update ELO. Target 10 questions with graceful fallback."
        />
        <div className="mb-6 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">主題 · Topic</p>
          <p className="mt-1">{PHASE1_TOPIC_LABELS[topicKey]}</p>
        </div>
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
          <PracticeStartClient topicKey={topicKey} />
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
    if (view.status === "abandoned") {
      return (
        <div>
          <BilingualHeading titleZh="練習" titleEn="Practice" descriptionZh="" descriptionEn="" />
          <AppCard>此場次已放棄。請重新開始。</AppCard>
          <PracticeStartClient topicKey={view.topicKey} />
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
        <PracticeSessionClient
          topicKey={view.topicKey}
          label={view.label}
          sessionId={view.sessionId}
          status={view.status}
          questions={view.questions}
          initialPos={view.currentPosition}
          itemStatesJson={view.itemStatesJson}
          completedSummary={view.completedSummary}
          nextStep={view.nextStep}
        />
      </div>
    );
  }

  return null;
}
