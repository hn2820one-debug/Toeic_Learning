import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BilingualHeading from "@/components/ui/BilingualHeading";
import { LearningSurface, learningSectionGap } from "@/components/ui/learning-surface";
import { formatYearMonth, isFutureYmd, isTodayYmd, monthBoundsUtc } from "@/lib/calendar/calendar-tags";
import { emptyDayCell, getMonthSummary, type DayCell } from "@/lib/calendar/aggregator";

const TZ = "Asia/Taipei";

function parseYm(raw: string | undefined): { year: number; month: number } | null {
  if (!raw?.trim()) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 1970 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function ymFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

async function calendarWeekMeta(year: number, month: number): Promise<{ pad: number; weekdayLabels: string[] }> {
  const h = await headers();
  const accept = h.get("accept-language")?.split(",")[0]?.trim() || "en-US";
  let weekStartsSunday = false;
  try {
    const loc = new Intl.Locale(accept);
    const fd = (loc as unknown as { weekInfo?: { firstDay?: number } }).weekInfo?.firstDay;
    if (fd === 7) weekStartsSunday = true;
  } catch {
    // ignore
  }
  const noon = new Date(`${year}-${String(month).padStart(2, "0")}-01T12:00:00+08:00`);
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(noon);
  const sun0: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const s0 = sun0[short] ?? 0;
  const pad = weekStartsSunday ? s0 : (s0 + 6) % 7;
  const weekdayLabels = weekStartsSunday
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return { pad, weekdayLabels };
}

function cellBackground(n: number): string {
  if (n <= 0) return "var(--color-background-secondary)";
  if (n <= 5) return "var(--color-background-success-20)";
  if (n <= 15) return "var(--color-background-success-50)";
  if (n <= 30) return "var(--color-background-success-80)";
  return "var(--color-text-success)";
}

function modeLetter(mode: string): { ch: string; colorVar: string } {
  switch (mode) {
    case "learn":
      return { ch: "L", colorVar: "var(--color-mode-learn)" };
    case "practice":
      return { ch: "P", colorVar: "var(--color-mode-practice)" };
    case "test":
      return { ch: "T", colorVar: "var(--color-mode-test)" };
    case "review":
      return { ch: "R", colorVar: "var(--color-mode-review)" };
    case "warmup":
      return { ch: "W", colorVar: "var(--color-mode-warmup)" };
    default:
      return { ch: mode.slice(0, 1).toUpperCase(), colorVar: "var(--color-primary-600)" };
  }
}

type CalendarPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const sp = (await searchParams) ?? {};
  const parsed = parseYm(sp.month);
  const now = new Date();
  const curYm = formatYearMonth(now, TZ);
  const { year, month } = parsed ?? (() => {
    const [y, m] = curYm.split("-").map(Number);
    return { year: y!, month: m! };
  })();

  if (sp.month?.trim() && !parsed) {
    redirect(`/calendar?month=${curYm}`);
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const grid = await getMonthSummary(year, month);
  const { pad, weekdayLabels } = await calendarWeekMeta(year, month);
  const { start, end } = monthBoundsUtc(year, month);
  const dayCount = Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000));

  const cells: Array<{ kind: "blank" } | { kind: "day"; date: string; cell: DayCell }> = [];
  for (let i = 0; i < pad; i++) cells.push({ kind: "blank" });
  for (let i = 0; i < dayCount; i++) {
    const t = start.getTime() + i * 24 * 3600 * 1000;
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
    cells.push({ kind: "day", date: dateStr, cell: grid.get(dateStr) ?? emptyDayCell(dateStr) });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "blank" });
  while (cells.length < 42) cells.push({ kind: "blank" });

  let studyDays = 0;
  let sumItems = 0;
  let sumCorrect = 0;
  let sumTotalForAcc = 0;
  for (const c of grid.values()) {
    if (c.hasMeaningfulLearningActivity) studyDays += 1;
    sumItems += c.totalItems;
    sumCorrect += c.correctCount;
    sumTotalForAcc += c.totalItems;
  }
  const monthAccuracy = sumTotalForAcc > 0 ? Math.round((sumCorrect / sumTotalForAcc) * 1000) / 10 : null;

  const titleZh = `${year} 年 ${month} 月`;

  return (
    <div className={learningSectionGap}>
      <BilingualHeading
        titleZh="學習日曆"
        titleEn="Learning calendar"
        descriptionZh="依日期檢視學習節奏與題量；「有效學習」含完成練習／測驗、複習評分、計劃勾選、驗收通過或當日完成主題 Learn 等（非僅開啟頁面）。"
        descriptionEn="Volume by date; “effective study” days count completed work, ratings, plan rows, checkpoint passes, or topic learn completion—not mere page views."
      />

      <LearningSurface>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-medium text-slate-900">{titleZh}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Link
              href={`/calendar?month=${ymFromParts(prev.year, prev.month)}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
            >
              ← 上月
            </Link>
            <Link
              href={`/calendar?month=${ymFromParts(next.year, next.month)}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
            >
              下月 →
            </Link>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-600 max-sm:min-w-[560px] max-sm:overflow-x-auto">
          {weekdayLabels.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 max-sm:min-w-[560px] max-sm:overflow-x-auto">
          {cells.map((slot, idx) => {
            if (slot.kind === "blank") {
              return <div key={`b-${idx}`} className="min-h-16 rounded-md bg-[var(--color-background-secondary)]/60" />;
            }
            const { date: dateStr, cell: dc } = slot;
            const future = isFutureYmd(dateStr, now, TZ);
            const today = isTodayYmd(dateStr, now, TZ);
            const n = dc.totalItems;
            const label = n > 0 ? `${n} 題` : dc.totalMinutes > 0 ? `${dc.totalMinutes} 分` : "";
            const bg = cellBackground(n);
            const textStrong = n > 30;
            const inner = (
              <div
                className="flex min-h-16 flex-col rounded-md border border-slate-200/80 p-1.5"
                style={{ backgroundColor: bg, color: textStrong ? "#fff" : undefined }}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`text-[16px] font-medium leading-none ${today ? "underline decoration-2 underline-offset-2" : ""}`}
                    style={{ color: textStrong ? "#fff" : "var(--color-primary-900)" }}
                  >
                    {dateStr.slice(8)}
                  </span>
                  {today ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary-600)]" title="今天" /> : null}
                </div>
                {future ? null : (
                  <>
                    {label ? (
                      <span className={`mt-1 text-xs ${textStrong ? "text-white" : "text-slate-800"}`}>{label}</span>
                    ) : null}
                    <div className="mt-auto flex gap-0.5 pt-1">
                      {dc.modes.slice(0, 3).map((m) => {
                        const { ch, colorVar } = modeLetter(m);
                        return (
                          <span
                            key={m}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-medium"
                            style={{ color: colorVar, backgroundColor: textStrong ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.65)" }}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
            if (future) {
              return (
                <div key={dateStr} className="opacity-90" aria-disabled>
                  {inner}
                </div>
              );
            }
            return (
              <Link key={dateStr} href={`/calendar/${dateStr}`} className="block min-h-16 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                {inner}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-800 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs text-slate-600">有效學習天數</p>
            <p className="mt-1 text-[24px] font-medium text-slate-900">{studyDays}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs text-slate-600">本月總題數</p>
            <p className="mt-1 text-[24px] font-medium text-slate-900">{sumItems}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs text-slate-600">本月平均正確率</p>
            <p className="mt-1 text-[24px] font-medium text-slate-900">{monthAccuracy != null ? `${monthAccuracy}%` : "—"}</p>
          </div>
        </div>
      </LearningSurface>
    </div>
  );
}
