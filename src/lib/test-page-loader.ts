import "server-only";

import { PHASE1_TOPIC_LABELS } from "@/content/programs/phase1/skill-map";
import { PHASE1_TOPIC_KEYS_IN_ORDER } from "@/content/programs/phase1/topic-order";
import type { Phase1TopicKey } from "@/content/programs/phase1/types";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getTestResultSummary, parseTestItemState, type TestResultSummary } from "@/lib/test-mode";
import { prisma } from "@/lib/prisma";
import { findActiveSessionResumeCandidate } from "@/lib/session-resume";
import { getCompletionNextStep, type CompletionNextStep } from "@/lib/session-summary";

function isPhase1TopicKey(id: string): id is Phase1TopicKey {
  return (PHASE1_TOPIC_KEYS_IN_ORDER as readonly string[]).includes(id);
}

/** Active test: no correct answer or explanation leaked to the client */
export type TestQuestionPayloadActive = {
  id: number;
  position: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type TestPageView =
  | { kind: "no_topic" }
  | { kind: "no_user"; topicKey: Phase1TopicKey; label: string }
  | {
      kind: "not_ready";
      topicKey: Phase1TopicKey;
      label: string;
      reason: "stage_not_practiced" | "no_progress_row";
      stage: string | null;
    }
  | {
      kind: "ready";
      topicKey: Phase1TopicKey;
      label: string;
      resumeCandidate?: { sessionId: string; stale: boolean };
    }
  | {
      kind: "session";
      topicKey: Phase1TopicKey;
      label: string;
      sessionId: string;
      status: "active" | "completed" | "abandoned";
      questions: TestQuestionPayloadActive[];
      currentPosition: number;
      itemStatesJson: unknown[];
      /** Present when status === completed */
      resultSummary?: TestResultSummary;
      compositionWarnings?: string[];
      nextStep?: CompletionNextStep;
    };

export async function getTestPageView(params: {
  topicKey: string | undefined;
  /** Alias for topicKey from `?topic=` */
  topicAlias?: string | undefined;
  sessionId: string | undefined;
  pos: number;
}): Promise<TestPageView> {
  const raw = params.topicKey ?? params.topicAlias;
  if (!raw || !isPhase1TopicKey(raw)) {
    return { kind: "no_topic" };
  }
  const topicKey = raw;
  const label = PHASE1_TOPIC_LABELS[topicKey];

  const user = await getOrCreateDevUser();
  if (!user) {
    return { kind: "no_user", topicKey, label };
  }

  const progress = await prisma.userTopicProgress.findUnique({
    where: { userId_topicKey: { userId: user.id, topicKey } },
  });

  if (!params.sessionId) {
    const candidate = await findActiveSessionResumeCandidate({
      userId: user.id,
      mode: "test",
      topicKey,
    });
    if (candidate && !candidate.stale) {
      params = { ...params, sessionId: candidate.sessionId };
    } else if (candidate) {
      if (!progress || progress.stage !== "Practiced") {
        return {
          kind: "not_ready",
          topicKey,
          label,
          reason: !progress ? "no_progress_row" : "stage_not_practiced",
          stage: progress?.stage ?? null,
        };
      }
      return { kind: "ready", topicKey, label, resumeCandidate: { sessionId: candidate.sessionId, stale: true } };
    }
  }

  if (params.sessionId) {
    const session = await prisma.learningSession.findFirst({
      where: {
        id: params.sessionId,
        userId: user.id,
        mode: "test",
      },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: { question: true },
        },
      },
    });

    if (session) {
      const tk = (session.topicKey as Phase1TopicKey | null) ?? topicKey;
      const pos = Number.isFinite(params.pos) ? Math.max(0, Math.floor(params.pos)) : 0;

      if (session.status === "active") {
        const questions: TestQuestionPayloadActive[] = session.items.map((it) => {
          const q = it.question;
          return {
            id: q.id,
            position: it.position,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
          };
        });
        const nextStep = await getCompletionNextStep({
          defaultHref: `/learn/${encodeURIComponent(tk)}`,
          defaultTitleZh: "回到今日學習",
          defaultDetailZh: "驗收後建議先處理 learning path 排序最高的任務。",
        });

        return {
          kind: "session",
          topicKey: tk,
          label: PHASE1_TOPIC_LABELS[tk],
          sessionId: session.id,
          status: "active",
          questions,
          currentPosition: Math.min(pos, Math.max(0, questions.length - 1)),
          itemStatesJson: session.items.map((it) => it.testStateJson ?? null),
        };
      }

      if (session.status === "completed") {
        const summary = getTestResultSummary({
          items: session.items.map((it) => {
            const q = it.question;
            return {
              position: it.position,
              questionText: q.questionText,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              testState: parseTestItemState(it.testStateJson),
            };
          }),
        });

        const snap = await prisma.checkpointAttempt.findFirst({
          where: { learningSessionId: session.id },
          orderBy: { createdAt: "desc" },
          select: { summarySnapshot: true },
        });
        let compositionWarnings: string[] | undefined;
        if (snap?.summarySnapshot) {
          try {
            const o = JSON.parse(snap.summarySnapshot) as { compositionWarnings?: string[] };
            if (Array.isArray(o.compositionWarnings)) {
              compositionWarnings = o.compositionWarnings;
            }
          } catch {
            /* ignore */
          }
        }

        const questions: TestQuestionPayloadActive[] = session.items.map((it) => {
          const q = it.question;
          return {
            id: q.id,
            position: it.position,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
          };
        });
        const nextStep = await getCompletionNextStep({
          defaultHref: `/learn/${encodeURIComponent(tk)}`,
          defaultTitleZh: "回到今日學習",
          defaultDetailZh: "驗收後建議先處理 learning path 排序最高的任務。",
        });

        return {
          kind: "session",
          topicKey: tk,
          label: PHASE1_TOPIC_LABELS[tk],
          sessionId: session.id,
          status: "completed",
          questions,
          currentPosition: 0,
          itemStatesJson: session.items.map((it) => it.testStateJson ?? null),
          resultSummary: summary,
          compositionWarnings,
          nextStep,
        };
      }

      return {
        kind: "session",
        topicKey: tk,
        label: PHASE1_TOPIC_LABELS[tk],
        sessionId: session.id,
        status: "abandoned",
        questions: [],
        currentPosition: 0,
        itemStatesJson: [],
      };
    }
  }

  if (!progress || progress.stage !== "Practiced") {
    return {
      kind: "not_ready",
      topicKey,
      label,
      reason: !progress ? "no_progress_row" : "stage_not_practiced",
      stage: progress?.stage ?? null,
    };
  }

  return { kind: "ready", topicKey, label };
}
