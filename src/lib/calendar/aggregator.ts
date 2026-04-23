import "server-only";

import type { LearningSessionMode } from "../../../generated/prisma";
import { unstable_cache } from "next/cache";

import { getOrCreateDevUser } from "@/lib/dev-user";
import { prisma } from "@/lib/prisma";
import { isReviewItemRated, parseReviewItemState } from "@/lib/review-mode";

import { calendarMonthTag, formatYmd, isValidYmd, monthBoundsUtc } from "./calendar-tags";
import { dayHasMeaningfulLearningActivity } from "./meaningful-activity";
import { aggregateSessionItems, sessionDurationSec, type ItemRow } from "./session-metrics";

/**
 * Calendar bucketing: every `LearningSession` is assigned to exactly one calendar day using
 * `startedAt` interpreted in **Asia/Taipei** (YYYY-MM-DD via `formatYmd`). This matches how learners
 * perceive “today’s study” in local date. Month queries use `[start, end)` month bounds in +08:00.
 */
const TZ = "Asia/Taipei";

export type DayCell = {
  date: string;
  /** True if at least one session started on this day (volume / modes). */
  hasActivity: boolean;
  /** True if the day had a completed learn topic, checkpoint pass, study-plan day done, or meaningful session work — see `dayHasMeaningfulLearningActivity`. */
  hasMeaningfulLearningActivity: boolean;
  sessionCount: number;
  totalItems: number;
  correctCount: number;
  accuracy: number | null;
  totalMinutes: number;
  modes: string[];
  hintsUsed: number;
  /** Passed `CheckpointAttempt` rows whose `createdAt` falls on this calendar day (not a stage-upgrade count). */
  checkpointPassCount: number;
  plannedTaskCount: number | null;
  plannedCompleted: number | null;
};

export type SessionSummary = {
  id: string;
  mode: string;
  startedAt: Date;
  finishedAt: Date | null;
  totalItems: number;
  correctCount: number;
  accuracy: number | null;
  durationSec: number | null;
  hintsUsed: number;
  topicName: string | null;
  testPassed: boolean | null;
};

export type TopicMove = {
  topicName: string;
  fromStage: string;
  toStage: string;
};

export type DayDetail = {
  date: string;
  sessions: SessionSummary[];
  topicProgress: TopicMove[];
  fsrsReviewed: number;
  newLearned: number;
  totalHints: number;
  longestSession: number;
  cognitiveLoad: number | null;
  plannedTaskCount: number | null;
  plannedCompleted: number | null;
};

function countActivitiesJson(raw: unknown): number {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return 0;
    }
  }
  return Array.isArray(v) ? v.length : 0;
}

export function emptyDayCell(date: string): DayCell {
  return {
    date,
    hasActivity: false,
    hasMeaningfulLearningActivity: false,
    sessionCount: 0,
    totalItems: 0,
    correctCount: 0,
    accuracy: null,
    totalMinutes: 0,
    modes: [],
    hintsUsed: 0,
    checkpointPassCount: 0,
    plannedTaskCount: null,
    plannedCompleted: null,
  };
}

function accuracyOf(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 1000) / 10;
}

/** Loads sessions whose `startedAt` is in `[start, end)`; day labels are derived with `formatYmd(..., TZ)`. */
async function loadSessionsInRange(userId: number, start: Date, end: Date) {
  return prisma.learningSession.findMany({
    where: {
      userId,
      startedAt: { gte: start, lt: end },
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        select: { practiceStateJson: true, testStateJson: true, reviewStateJson: true },
      },
    },
    orderBy: { startedAt: "asc" },
  });
}

async function loadPlannedByYmd(userId: number, start: Date, end: Date): Promise<Map<string, { tasks: number; completedRows: number; cognitive: number | null }>> {
  const rows = await prisma.dailyPlanItem.findMany({
    where: {
      plannedDate: { gte: start, lt: end },
      studyPlan: { userId, status: "active" },
    },
    select: { plannedDate: true, activitiesJson: true, completed: true, cognitiveLoad: true },
  });
  const map = new Map<string, { tasks: number; completedRows: number; cognitive: number | null }>();
  for (const r of rows) {
    if (!r.plannedDate) continue;
    const key = formatYmd(r.plannedDate, TZ);
    const prev = map.get(key) ?? { tasks: 0, completedRows: 0, cognitive: null as number | null };
    prev.tasks += countActivitiesJson(r.activitiesJson);
    if (r.completed) prev.completedRows += 1;
    if (typeof r.cognitiveLoad === "number" && r.cognitiveLoad >= 1 && r.cognitiveLoad <= 5) {
      prev.cognitive = prev.cognitive == null ? r.cognitiveLoad : Math.max(prev.cognitive, r.cognitiveLoad);
    }
    map.set(key, prev);
  }
  return map;
}

async function loadCheckpointPassMap(sessionIds: string[]): Promise<Map<string, boolean>> {
  if (sessionIds.length === 0) return new Map();
  const rows = await prisma.checkpointAttempt.findMany({
    where: { learningSessionId: { in: sessionIds } },
    select: { learningSessionId: true, passed: true },
  });
  const m = new Map<string, boolean>();
  for (const r of rows) {
    if (r.learningSessionId) m.set(r.learningSessionId, r.passed);
  }
  return m;
}

async function loadTopicLabels(keys: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(keys.filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const rows = await prisma.learningTopic.findMany({
    where: { topicKey: { in: uniq } },
    select: { topicKey: true, labelZh: true },
  });
  return new Map(rows.map((r) => [r.topicKey, r.labelZh?.trim() ? r.labelZh.trim() : r.topicKey]));
}

async function computeMonthSummary(userId: number, year: number, month: number): Promise<Map<string, DayCell>> {
  const { start, end } = monthBoundsUtc(year, month);
  const sessions = await loadSessionsInRange(userId, start, end);
  const plannedMap = await loadPlannedByYmd(userId, start, end);

  const learnCompletionsByDay = new Map<string, number>();
  const learnRows = await prisma.userTopicProgress.findMany({
    where: {
      userId,
      learnCompletedAt: { gte: start, lt: end },
    },
    select: { learnCompletedAt: true },
  });
  for (const r of learnRows) {
    if (!r.learnCompletedAt) continue;
    const k = formatYmd(r.learnCompletedAt, TZ);
    learnCompletionsByDay.set(k, (learnCompletionsByDay.get(k) ?? 0) + 1);
  }

  const sessionsByDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const k = formatYmd(s.startedAt, TZ);
    const arr = sessionsByDay.get(k) ?? [];
    arr.push(s);
    sessionsByDay.set(k, arr);
  }

  const checkpointDayCounts = new Map<string, number>();
  const cpRows = await prisma.checkpointAttempt.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
      passed: true,
    },
    select: { createdAt: true },
  });
  for (const c of cpRows) {
    const k = formatYmd(c.createdAt, TZ);
    checkpointDayCounts.set(k, (checkpointDayCounts.get(k) ?? 0) + 1);
  }

  const byDay = new Map<string, DayCell>();
  const modeByDay = new Map<string, Set<string>>();

  for (let t = start.getTime(); t < end.getTime(); t += 24 * 3600 * 1000) {
    const key = formatYmd(new Date(t), TZ);
    byDay.set(key, emptyDayCell(key));
  }

  for (const s of sessions) {
    const key = formatYmd(s.startedAt, TZ);
    const cell = byDay.get(key);
    if (!cell) continue;
    const items = s.items as ItemRow[];
    const agg = aggregateSessionItems(s.mode, items);
    const dur = sessionDurationSec(s.startedAt, s.endedAt, s.abandonedAt);
    const minutes = dur != null ? Math.round(dur / 60) : 0;

    cell.hasActivity = true;
    cell.sessionCount += 1;
    cell.totalItems += agg.totalItems;
    cell.correctCount += agg.correctCount;
    cell.hintsUsed += agg.hintsUsed;
    cell.totalMinutes += minutes;
    const ms = modeByDay.get(key) ?? new Set<string>();
    ms.add(String(s.mode).toLowerCase());
    modeByDay.set(key, ms);
  }

  for (const [k, cell] of byDay) {
    cell.accuracy = accuracyOf(cell.correctCount, cell.totalItems);
    const cp = checkpointDayCounts.get(k) ?? 0;
    cell.checkpointPassCount = cp;
    const modes = modeByDay.get(k);
    if (modes) cell.modes = [...modes].sort();
    const p = plannedMap.get(k);
    if (p) {
      cell.plannedTaskCount = p.tasks;
      cell.plannedCompleted = p.completedRows;
    }
    const daySessions = sessionsByDay.get(k) ?? [];
    cell.hasMeaningfulLearningActivity = dayHasMeaningfulLearningActivity({
      checkpointPassCount: cp,
      learnTopicCompletionsOnDay: learnCompletionsByDay.get(k) ?? 0,
      studyPlanCompletedRowCount: p?.completedRows ?? 0,
      sessions: daySessions.map((s) => ({
        mode: s.mode,
        status: s.status,
        items: s.items as ItemRow[],
      })),
    });
  }

  return byDay;
}

async function computeDayDetail(userId: number, dateStr: string): Promise<DayDetail> {
  const d = new Date(`${dateStr}T00:00:00+08:00`);
  const next = new Date(d.getTime() + 24 * 3600 * 1000);
  const sessions = await loadSessionsInRange(userId, d, next);
  const topicKeys = sessions.map((s) => s.topicKey).filter((k): k is string => Boolean(k));
  const labels = await loadTopicLabels(topicKeys);
  const testIds = sessions.filter((s) => s.mode === "test").map((s) => s.id);
  const passMap = await loadCheckpointPassMap(testIds);

  const summaries: SessionSummary[] = [];
  let totalHints = 0;
  let longestSession = 0;
  let fsrsReviewed = 0;
  let newLearned = 0;

  for (const s of sessions) {
    const items = s.items as ItemRow[];
    const agg = aggregateSessionItems(s.mode, items);
    const dur = sessionDurationSec(s.startedAt, s.endedAt, s.abandonedAt);
    if (dur != null) longestSession = Math.max(longestSession, dur);
    totalHints += agg.hintsUsed;
    if (s.mode === "review") {
      fsrsReviewed += items.filter((it) => isReviewItemRated(parseReviewItemState(it.reviewStateJson))).length;
    }
    if (s.mode === "learn") {
      newLearned += agg.totalItems;
    }

    let testPassed: boolean | null = null;
    if (s.mode === "test") {
      testPassed = passMap.get(s.id) ?? null;
    }

    summaries.push({
      id: s.id,
      mode: String(s.mode).toLowerCase(),
      startedAt: s.startedAt,
      finishedAt: s.endedAt ?? s.abandonedAt ?? null,
      totalItems: agg.totalItems,
      correctCount: agg.correctCount,
      accuracy: accuracyOf(agg.correctCount, agg.totalItems),
      durationSec: dur,
      hintsUsed: agg.hintsUsed,
      topicName: s.topicKey ? labels.get(s.topicKey) ?? s.topicKey : null,
      testPassed,
    });
  }

  const progressRows = await prisma.userTopicProgress.findMany({
    where: { userId },
    include: { topic: { select: { labelZh: true } } },
  });

  /** Snapshot milestones by date; `fromStage` is not historical (no audit table) — only `toStage` is informative. */
  const topicProgress: TopicMove[] = [];
  for (const r of progressRows) {
    const tname = r.topic.labelZh?.trim() || r.topicKey;
    if (r.testPassedAt && formatYmd(r.testPassedAt, TZ) === dateStr) {
      topicProgress.push({ topicName: tname, fromStage: "—", toStage: "Tested" });
    } else if (r.practicePassedAt && formatYmd(r.practicePassedAt, TZ) === dateStr) {
      topicProgress.push({ topicName: tname, fromStage: "—", toStage: "Practiced" });
    }
    if (r.learnCompletedAt && formatYmd(r.learnCompletedAt, TZ) === dateStr) {
      topicProgress.push({ topicName: tname, fromStage: "—", toStage: "Learn 完成" });
    }
  }

  const planned = await loadPlannedByYmd(userId, d, next);
  const p = planned.get(dateStr);

  return {
    date: dateStr,
    sessions: summaries.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime()),
    topicProgress,
    fsrsReviewed,
    newLearned,
    totalHints,
    longestSession,
    cognitiveLoad: p?.cognitive ?? null,
    plannedTaskCount: p?.tasks ?? null,
    plannedCompleted: p?.completedRows ?? null,
  };
}

function emptyMonthMap(year: number, month: number): Map<string, DayCell> {
  const { start, end } = monthBoundsUtc(year, month);
  const m = new Map<string, DayCell>();
  for (let t = start.getTime(); t < end.getTime(); t += 24 * 3600 * 1000) {
    const key = formatYmd(new Date(t), TZ);
    m.set(key, emptyDayCell(key));
  }
  return m;
}

export async function getMonthSummary(year: number, month: number): Promise<Map<string, DayCell>> {
  const user = await getOrCreateDevUser();
  if (!user) return emptyMonthMap(year, month);

  const ym = `${year}-${String(month).padStart(2, "0")}`;
  return unstable_cache(
    async () => computeMonthSummary(user.id, year, month),
    ["calendar-month-summary", String(user.id), ym],
    { revalidate: 300, tags: [calendarMonthTag(ym)] },
  )();
}

export async function getDaySummary(dateStr: string): Promise<DayDetail | null> {
  if (!isValidYmd(dateStr)) return null;

  const user = await getOrCreateDevUser();
  if (!user) {
    return {
      date: dateStr,
      sessions: [],
      topicProgress: [],
      fsrsReviewed: 0,
      newLearned: 0,
      totalHints: 0,
      longestSession: 0,
      cognitiveLoad: null,
      plannedTaskCount: null,
      plannedCompleted: null,
    };
  }

  const ym = dateStr.slice(0, 7);
  return unstable_cache(
    async () => computeDayDetail(user.id, dateStr),
    ["calendar-day-detail", String(user.id), dateStr],
    { revalidate: 300, tags: [calendarMonthTag(ym)] },
  )();
}
