import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import BilingualHeading from "@/components/ui/BilingualHeading";
import { LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import { getDaySummary } from "@/lib/calendar/aggregator";
import { isFutureYmd, isValidYmd } from "@/lib/calendar/calendar-tags";

const TZ = "Asia/Taipei";

type DayPageProps = {
  params: Promise<{ date: string }>;
};

function formatHm(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function modeBadgeStyle(mode: string): CSSProperties {
  const border = "1px solid color-mix(in srgb, var(--color-primary-300) 55%, transparent)";
  switch (mode) {
    case "learn":
      return { color: "var(--color-mode-learn)", border, backgroundColor: "color-mix(in srgb, var(--color-mode-learn) 10%, white)" };
    case "practice":
      return { color: "var(--color-mode-practice)", border, backgroundColor: "color-mix(in srgb, var(--color-mode-practice) 10%, white)" };
    case "test":
      return { color: "var(--color-mode-test)", border, backgroundColor: "color-mix(in srgb, var(--color-mode-test) 10%, white)" };
    case "review":
      return { color: "var(--color-mode-review)", border, backgroundColor: "color-mix(in srgb, var(--color-mode-review) 10%, white)" };
    case "warmup":
      return { color: "var(--color-mode-warmup)", border, backgroundColor: "color-mix(in srgb, var(--color-mode-warmup) 10%, white)" };
    default:
      return { color: "var(--color-primary-900)", border, backgroundColor: "var(--color-background-secondary)" };
  }
}

export default async function CalendarDayPage({ params }: DayPageProps) {
  const { date: raw } = await params;
  if (!isValidYmd(raw)) notFound();

  const future = isFutureYmd(raw, new Date(), TZ);
  const detail = await getDaySummary(raw);
  if (!detail) notFound();

  const ym = raw.slice(0, 7);
  let totalItems = 0;
  let sumCorrect = 0;
  let sumMinutes = 0;
  for (const s of detail.sessions) {
    totalItems += s.totalItems;
    sumCorrect += s.correctCount;
    if (s.durationSec != null) sumMinutes += Math.round(s.durationSec / 60);
  }
  const dayAccuracy = totalItems > 0 ? Math.round((sumCorrect / totalItems) * 1000) / 10 : null;

  return (
    <div className={learningSectionGap}>
      <BilingualHeading
        titleZh={`${raw} 學習紀錄`}
        titleEn={`Learning log · ${raw}`}
        descriptionZh="只讀彙總：依 LearningSession 與題目狀態 JSON 推算題數、正確率與時長。"
        descriptionEn="Read-only summary derived from LearningSession rows and per-item JSON states."
      />

      <LearningSurface>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/calendar?month=${ym}`}
            className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            ← 返回日曆
          </Link>
          <h2 className="text-lg font-medium text-slate-900">{raw}</h2>
        </div>

        {future ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">這天還沒到，繼續加油！</p>
        ) : detail.sessions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">這天沒有學習紀錄。</p>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">總題數 / 正確率</p>
                <p className="mt-1 text-[24px] font-medium text-slate-900">
                  {totalItems} / {dayAccuracy != null ? `${dayAccuracy}%` : "—"}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">學習時間（分鐘）</p>
                <p className="mt-1 text-[24px] font-medium text-slate-900">{sumMinutes}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">FSRS 複習 / 新學題數</p>
                <p className="mt-1 text-[24px] font-medium text-slate-900">
                  {detail.fsrsReviewed} / {detail.newLearned}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">Hints 使用</p>
                <p className="mt-1 text-[24px] font-medium text-slate-900">{detail.totalHints}</p>
              </div>
            </div>

            <h3 className="mb-2 text-sm font-medium text-slate-900">Sessions</h3>
            <ul className="space-y-2">
              {detail.sessions.map((s) => {
                const durMin = s.durationSec != null ? Math.max(0, Math.round(s.durationSec / 60)) : null;
                const acc = s.accuracy != null ? `${s.accuracy}%` : "—";
                const testLine =
                  s.mode === "test" ? (s.testPassed === true ? "PASS" : s.testPassed === false ? "FAIL" : "—") : null;
                return (
                  <li key={s.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium uppercase"
                        style={modeBadgeStyle(s.mode)}
                      >
                        {s.mode.toUpperCase()}
                      </span>
                      <span className="text-[13px] text-slate-700">{formatHm(s.startedAt)} 開始</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-[13px] text-slate-800 sm:grid-cols-2">
                      <p>
                        題數 {s.totalItems} · 正確率 {acc}
                      </p>
                      <p>時長 {durMin == null ? "—" : `${durMin} 分`}</p>
                      <p>主題 {s.topicName ?? "—"}</p>
                      <p>Hints {s.hintsUsed}</p>
                      {testLine != null ? <p>測驗結果 {testLine}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            {detail.topicProgress.length > 0 ? (
              <section className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-slate-900">主題里程碑（當日快照）</h3>
                <p className="mb-2 text-xs text-slate-600">
                  下列為當日有時間戳的節點標記；並非完整晉階歷史（無審計表則不顯示真實 from→to 轉移序）。
                </p>
                <ul className="space-y-1 text-sm text-slate-800">
                  {detail.topicProgress.map((t, i) => (
                    <li key={`${t.topicName}-${i}`}>
                      [{t.topicName}] {t.fromStage === "—" ? `標記：${t.toStage}` : `${t.fromStage} → ${t.toStage}`}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.plannedTaskCount != null ? (
              <section className="mt-6 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-800">
                <h3 className="mb-1 text-sm font-medium text-slate-900">計劃 vs 實際</h3>
                <p>計劃任務數：{detail.plannedTaskCount}</p>
                <p>已完成計劃列數：{detail.plannedCompleted ?? 0}</p>
                <p>認知負載：{detail.cognitiveLoad != null ? `${detail.cognitiveLoad}/5` : "—"}</p>
              </section>
            ) : null}
          </>
        )}
      </LearningSurface>
    </div>
  );
}
