/** Cache / revalidation tag for month-scoped calendar data (per product spec). */
export function calendarMonthTag(ym: string): string {
  return `calendar-month-${ym}`;
}

/** `ym` = YYYY-MM in `timeZone` for the given instant. */
export function calendarMonthTagForDate(d: Date, timeZone = "Asia/Taipei"): string {
  const ym = formatYearMonth(d, timeZone);
  return calendarMonthTag(ym);
}

export function formatYearMonth(d: Date, timeZone = "Asia/Taipei"): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = p.find((x) => x.type === "year")?.value ?? "1970";
  const m = p.find((x) => x.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

export function formatYmd(d: Date, timeZone = "Asia/Taipei"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function monthBoundsUtc(year: number, month: number): { start: Date; end: Date } {
  const mm = String(month).padStart(2, "0");
  const start = new Date(`${year}-${mm}-01T00:00:00+08:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nm = String(nextMonth).padStart(2, "0");
  const end = new Date(`${nextYear}-${nm}-01T00:00:00+08:00`);
  return { start, end };
}

export function isValidYmd(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+08:00`);
  return !Number.isNaN(dt.getTime());
}

export function isFutureYmd(dateStr: string, now = new Date(), timeZone = "Asia/Taipei"): boolean {
  const today = formatYmd(now, timeZone);
  return dateStr > today;
}

export function isTodayYmd(dateStr: string, now = new Date(), timeZone = "Asia/Taipei"): boolean {
  return dateStr === formatYmd(now, timeZone);
}
