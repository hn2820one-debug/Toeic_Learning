"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import CollapsibleNote from "@/components/ui/collapsible-note";
import AppCard from "@/components/ui/AppCard";
import SectionLabel from "@/components/ui/section-label";
import { LearningSurface } from "@/components/ui/learning-surface";
import { formatListenWindow, withVideoStartTime } from "@/lib/listening/external-video";
import type { ListeningProgressView, ListeningWorkbookView } from "@/lib/listening/workbook-loader";
import { KIND_LABEL_ZH, type ListeningMcqItem } from "@/lib/listening/workbook-types";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import { saveListeningWorkbookProgress } from "./actions";

const STEPS = [
  { id: 1, zh: "先聽（唔睇稿）", en: "Listen first" },
  { id: 2, zh: "第一輪題目", en: "Round 1" },
  { id: 3, zh: "重聽片段", en: "Listen again" },
  { id: 4, zh: "第二輪題目", en: "Round 2" },
  { id: 5, zh: "Transcript & key phrases", en: "Transcript" },
  { id: 6, zh: "Dictation & shadowing", en: "Drill" },
  { id: 7, zh: "Takeaway", en: "Note" },
  { id: 8, zh: "明日回顧", en: "Tomorrow" },
] as const;

type Props = {
  workbook: ListeningWorkbookView;
  progress: ListeningProgressView | null;
};

export default function ListeningWorkbookClient({ workbook: w, progress: initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState(initial?.lastStepSeen ?? 1);
  const [r1, setR1] = useState<Record<string, number>>(initial?.round1Answers ?? {});
  const [r2, setR2] = useState<Record<string, number>>(initial?.round2Answers ?? {});
  const [dict, setDict] = useState<Record<string, string>>(initial?.dictationAnswers ?? {});
  const [shadowOn, setShadowOn] = useState<Set<string>>(new Set(initial?.shadowingChecked ?? []));
  const [takeaway, setTakeaway] = useState(initial?.takeawayUser ?? "");
  const [tmr1, setTmr1] = useState(initial?.tomorrowReviewPoints[0] ?? "");
  const [tmr2, setTmr2] = useState(initial?.tomorrowReviewPoints[1] ?? "");

  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});

  const openUrl = useMemo(() => withVideoStartTime(w.sourceUrl, w.startSec), [w.sourceUrl, w.startSec]);
  const windowLabel = useMemo(() => formatListenWindow(w.startSec, w.endSec), [w.startSec, w.endSec]);

  const persist = useCallback(
    (patch: Omit<Parameters<typeof saveListeningWorkbookProgress>[0], "workbookId">) => {
      startTransition(() => {
        void saveListeningWorkbookProgress({ ...patch, workbookId: w.id });
      });
    },
    [w.id],
  );

  const scrollTo = (stepId: number) => {
    setActiveStep(stepId);
    persist({ lastStepSeen: stepId });
    sectionRefs.current[stepId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleShadow = (id: string) => {
    setShadowOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persist({ shadowingChecked: [...next] });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <LearningSurface>
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listening workbook</p>
            <h1 className="text-xl font-bold text-slate-900">{w.title}</h1>
            {w.sourceLabel ? <p className="mt-1 text-sm text-slate-600">{w.sourceLabel}</p> : null}
          </div>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButtonClass} inline-flex shrink-0 items-center justify-center`}
          >
            外部影片 · Open video
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeStep === s.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {s.id}. {s.zh}
            </button>
          ))}
        </div>
        {pending ? <p className="mt-2 text-xs text-slate-400">儲存中…</p> : null}
      </LearningSurface>

      <section
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md" className="border-sky-200/80 bg-sky-50/40">
          <SectionLabel kind="stem" />
          <h2 className="text-lg font-semibold text-slate-900">Step 1 · {STEPS[0].zh}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            先聽一輪，唔好開 transcript。用下面連結喺新分頁開片，跟住建議時間聽。
          </p>
          <p className="mt-2 text-sm font-medium text-slate-800">建議收聽區間 · {windowLabel}</p>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-semibold text-primary-700 underline"
          >
            開新分頁播放 · Open in new tab
          </a>
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[2] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Step 2 · {STEPS[1].zh}</h2>
          <p className="mt-1 text-sm text-slate-600">第一次聽完之後先做（唔使對稿）。</p>
          <McqBlock
            items={w.round1}
            values={r1}
            onChange={(id, idx) => {
              setR1((prev) => {
                const next = { ...prev, [id]: idx };
                persist({ round1Answers: next });
                return next;
              });
            }}
          />
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[3] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md" className="border-amber-50 bg-amber-50/35">
          <h2 className="text-lg font-semibold text-slate-900">Step 3 · {STEPS[2].zh}</h2>
          <p className="mt-2 text-sm text-slate-700">再聽指定區間，留意語氣同轉折。</p>
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-semibold text-primary-700 underline"
          >
            重開影片 · Open again
          </a>
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[4] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Step 4 · {STEPS[3].zh}</h2>
          <p className="mt-1 text-sm text-slate-600">重聽後再答。</p>
          <McqBlock
            items={w.round2}
            values={r2}
            onChange={(id, idx) => {
              setR2((prev) => {
                const next = { ...prev, [id]: idx };
                persist({ round2Answers: next });
                return next;
              });
            }}
          />
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[5] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Step 5 · Transcript & key phrases</h2>
          <CollapsibleNote summaryZh="展開逐字稿 · Transcript" summaryEn="Show transcript" defaultOpen={false}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{w.transcript}</p>
          </CollapsibleNote>
          {w.keyPhrases.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Key phrases</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {w.keyPhrases.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[6] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md" className="border-violet-100 bg-violet-50/30">
          <h2 className="text-lg font-semibold text-slate-900">Step 6 · Dictation & shadowing</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Dictation</p>
              {w.dictation.map((d) => (
                <div key={d.id} className="mt-2">
                  <p className="text-sm text-slate-700">{d.promptZh}</p>
                  <textarea
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner"
                    rows={3}
                    value={dict[d.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDict((prev) => ({ ...prev, [d.id]: v }));
                    }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      setDict((prev) => {
                        const next = { ...prev, [d.id]: v };
                        persist({ dictationAnswers: next });
                        return next;
                      });
                    }}
                  />
                  {d.answerZh ? (
                    <p className="mt-1 text-xs text-slate-500">參考：{d.answerZh}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="border-t border-violet-200/60 pt-4">
              <p className="text-sm font-semibold text-slate-800">Shadowing</p>
              <ul className="mt-2 space-y-3">
                {w.shadowing.map((s) => (
                  <li key={s.id} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300"
                        checked={shadowOn.has(s.id)}
                        onChange={() => toggleShadow(s.id)}
                      />
                      <span>
                        <span className="text-sm font-medium text-slate-900">{s.textEn}</span>
                        {s.noteZh ? <span className="mt-1 block text-xs text-slate-600">{s.noteZh}</span> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[7] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Step 7 · Takeaway</h2>
          {w.takeawayHintZh ? <p className="mt-1 text-sm text-slate-600">{w.takeawayHintZh}</p> : null}
          <textarea
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            rows={4}
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            onBlur={() => persist({ takeawayUser: takeaway })}
            placeholder="用幾句寫低今日最有用嘅一點…"
          />
        </AppCard>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[8] = el;
        }}
        className="scroll-mt-6"
      >
        <AppCard padding="md" className="border-emerald-200/70 bg-emerald-50/40">
          <h2 className="text-lg font-semibold text-slate-900">Step 8 · 隔日回顧</h2>
          {w.tomorrowReviewHintZh ? <p className="mt-1 text-sm text-slate-700">{w.tomorrowReviewHintZh}</p> : null}
          <p className="mt-2 text-xs text-slate-500">建立 1–2 個明日回顧點（會儲存喺進度）。</p>
          <input
            type="text"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={tmr1}
            onChange={(e) => setTmr1(e.target.value)}
            onBlur={() => persist({ tomorrowReviewPoints: [tmr1, tmr2] })}
            placeholder="回顧點 1"
          />
          <input
            type="text"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={tmr2}
            onChange={(e) => setTmr2(e.target.value)}
            onBlur={() => persist({ tomorrowReviewPoints: [tmr1, tmr2] })}
            placeholder="回顧點 2（可留空）"
          />
        </AppCard>
      </section>
    </div>
  );
}

function McqBlock({
  items,
  values,
  onChange,
}: {
  items: ListeningMcqItem[];
  values: Record<string, number>;
  onChange: (id: string, choiceIndex: number) => void;
}) {
  const labels = ["A", "B", "C", "D"] as const;
  return (
    <div className="mt-4 space-y-6">
      {items.map((q) => (
        <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <p className="text-xs font-semibold text-primary-700">{KIND_LABEL_ZH[q.kind]}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{q.promptZh}</p>
          {q.promptEn ? <p className="text-xs text-slate-500">{q.promptEn}</p> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, idx) => (
              <label
                key={idx}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  values[q.id] === idx ? "border-primary-400 bg-primary-50" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name={`mcq-${q.id}`}
                  checked={values[q.id] === idx}
                  onChange={() => onChange(q.id, idx)}
                />
                <span>
                  <span className="font-semibold text-primary-700">{labels[idx]}.</span> {c}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
