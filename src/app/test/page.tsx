import Link from "next/link";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getTestPageView } from "@/lib/test-page-loader";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import TestSessionClient, { TestStartClient } from "./TestSessionClient";

export const dynamic = "force-dynamic";

type TestPageProps = {
  searchParams?: { topicKey?: string; topic?: string; session?: string; pos?: string };
};

function parseTopicKey(raw: string | undefined): Phase1TopicKey | null {
  if (!raw) {
    return null;
  }
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(raw) ? (raw as Phase1TopicKey) : null;
}

export default async function TestPage({ searchParams }: TestPageProps) {
  const topicKey = parseTopicKey(
    typeof searchParams?.topicKey === "string"
      ? searchParams.topicKey
      : typeof searchParams?.topic === "string"
        ? searchParams.topic
        : undefined,
  );
  const sessionId = typeof searchParams?.session === "string" ? searchParams.session : undefined;
  const pos = Number.parseInt(typeof searchParams?.pos === "string" ? searchParams.pos : "0", 10) || 0;

  if (!topicKey) {
    return (
      <div>
        <BilingualHeading
          titleZh="驗收"
          titleEn="Test"
          descriptionZh="請帶入 topicKey 或 topic，例如 /test?topicKey=office 或 /test?topic=office。"
          descriptionEn="Open with ?topicKey=… or ?topic=…"
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
    topicKey: typeof searchParams?.topicKey === "string" ? searchParams.topicKey : undefined,
    topicAlias: typeof searchParams?.topic === "string" ? searchParams.topic : undefined,
    sessionId,
    pos,
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
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">主題 · Topic</p>
          <p className="mt-1">{PHASE1_TOPIC_LABELS[view.topicKey]}</p>
          <p className="mt-2 text-xs">
            目前階段 · Stage: {view.stage ?? "（無紀錄）"} · {view.reason === "no_progress_row" ? "尚無主題進度" : "未達 Practiced"}
          </p>
        </div>
        <AppCard padding="md">
          <Link href={`/practice?topicKey=${encodeURIComponent(view.topicKey)}`} className={primaryButtonClass}>
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
          descriptionZh="無提示、無重試；每題 30 秒，逾時計錯。完成後才顯示解析。通過後主題階段由 Practiced → Tested。"
          descriptionEn="No hints or retries; 30s per question. Explanations after submit. Pass promotes stage to Tested."
        />
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">主題 · Topic</p>
          <p className="mt-1">{PHASE1_TOPIC_LABELS[view.topicKey]}</p>
        </div>
        <AppCard padding="md">
          <TestStartClient topicKey={view.topicKey} />
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
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">主題 · Topic</p>
          <p className="mt-1">{PHASE1_TOPIC_LABELS[view.topicKey]}</p>
        </div>
        <TestSessionClient
          topicKey={view.topicKey}
          label={view.label}
          sessionId={view.sessionId}
          status={view.status}
          questions={view.questions}
          initialPos={view.currentPosition}
          itemStatesJson={view.itemStatesJson}
          resultSummary={view.resultSummary}
          compositionWarnings={view.compositionWarnings}
        />
      </div>
    );
  }

  return null;
}
