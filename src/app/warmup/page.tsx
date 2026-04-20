import Link from "next/link";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import WarmupIntro from "@/components/session/WarmupIntro";
import { LearningSurface } from "@/components/ui/learning-surface";
import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { getWarmupPageView } from "@/lib/session/warmup-page-loader";

import WarmupSessionClient from "./WarmupSessionClient";
import WarmupStartClient from "./WarmupStartClient";

export const dynamic = "force-dynamic";

type WarmupPageProps = {
  searchParams?: { topicKey?: string; flow?: string; session?: string; pos?: string };
};

const FLOW_LABEL: Record<"learn" | "practice" | "test", { nextZh: string }> = {
  learn: { nextZh: "主題學習" },
  practice: { nextZh: "腳手架練習" },
  test: { nextZh: "限時驗收" },
};

export default async function WarmupPage({ searchParams }: WarmupPageProps) {
  const pos = Number.parseInt(typeof searchParams?.pos === "string" ? searchParams.pos : "0", 10) || 0;

  const view = await getWarmupPageView({
    topicKey: typeof searchParams?.topicKey === "string" ? searchParams.topicKey : undefined,
    flow: typeof searchParams?.flow === "string" ? searchParams.flow : undefined,
    sessionId: typeof searchParams?.session === "string" ? searchParams.session : undefined,
    pos,
  });

  if (view.kind === "no_topic") {
    return (
      <div>
        <BilingualHeading
          titleZh="熱身"
          titleEn="Warm-up"
          descriptionZh="請帶入 topicKey 與 flow，例如 /warmup?topicKey=office&flow=practice。"
          descriptionEn="Use ?topicKey=…&flow=learn|practice|test"
        />
        <AppCard padding="md">
          <Link href="/learn" className="font-semibold text-primary-700 underline">
            前往今日學習 · /learn
          </Link>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "invalid_flow") {
    return (
      <div>
        <BilingualHeading titleZh="熱身" titleEn="Warm-up" descriptionZh="" descriptionEn="" />
        <AppCard padding="md">
          <p className="text-sm text-slate-800">請在網址加上 flow=learn、practice 或 test。</p>
          <Link href="/learn" className="mt-3 inline-block font-semibold text-primary-700 underline">
            返回 · Back
          </Link>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "no_user") {
    return (
      <div>
        <BilingualHeading titleZh="熱身" titleEn="Warm-up" descriptionZh="" descriptionEn="" />
        <AppCard className="border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-950">需要學習者帳號才能進行熱身。</p>
        </AppCard>
      </div>
    );
  }

  if (view.kind === "intro") {
    const fl = FLOW_LABEL[view.flow];
    return (
      <div>
        <BilingualHeading
          titleZh="2 分鐘熱身"
          titleEn="2-minute warm-up"
          descriptionZh="啟動大腦、不計正式成績；完成後再進入今天主線。"
          descriptionEn="Activation only — not graded. Then continue to your main task."
        />
        <LearningSurface className="space-y-6">
          <WarmupIntro topicLabel={PHASE1_TOPIC_LABELS[view.topicKey]} nextFlowLabelZh={fl.nextZh} />
          <WarmupStartClient topicKey={view.topicKey} flow={view.flow} />
        </LearningSurface>
      </div>
    );
  }

  return (
    <div>
      <BilingualHeading
        titleZh="2 分鐘熱身"
        titleEn="2-minute warm-up"
        descriptionZh="非正式測驗 · 喚醒舊知識後再進入主線。"
        descriptionEn="Not a test — prime memory, then continue."
      />
      <WarmupSessionClient
        topicKey={view.topicKey}
        label={view.label}
        flow={view.flow}
        sessionId={view.sessionId}
        status={view.status}
        questions={view.questions}
        initialPos={view.currentPosition}
        itemStatesJson={view.itemStatesJson}
        startedAtIso={view.startedAtIso}
      />
    </div>
  );
}
