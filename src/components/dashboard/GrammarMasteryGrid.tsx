import { prisma } from "@/lib/prisma";
import { parseQuestionNotes } from "@/lib/question-taxonomy";

const MAX_GRAMMAR_POINTS = 31;
const RECENT_PER_POINT = 20;
const UNTAGGED_LABEL = "Untagged";

function normalizeGrammarPoint(notes: string | null) {
  const t = (notes ?? "").trim();
  if (t.length === 0) {
    return UNTAGGED_LABEL;
  }

  const parsed = parseQuestionNotes(t);
  if (!parsed) {
    return t;
  }

  return parsed.category === "Grammar" ? parsed.subFocusLabel : "";
}

function accuracyStatusClasses(accuracy: number | null) {
  if (accuracy === null) {
    return "bg-gray-300 text-gray-800";
  }
  if (accuracy < 0.5) {
    return "bg-red-500 text-white";
  }
  if (accuracy < 0.7) {
    return "bg-orange-500 text-white";
  }
  if (accuracy < 0.85) {
    return "bg-yellow-300 text-gray-900";
  }
  return "bg-green-600 text-white";
}

export default async function GrammarMasteryGrid() {
  const history = await prisma.answerHistory.findMany({
    orderBy: { answeredAt: "desc" },
    take: 12_000,
    select: {
      isCorrect: true,
      question: { select: { notes: true } },
    },
  });

  const recentByPoint = new Map<string, boolean[]>();

  for (const row of history) {
    const point = normalizeGrammarPoint(row.question.notes);
    if (!point) {
      continue;
    }
    let bucket = recentByPoint.get(point);
    if (!bucket) {
      bucket = [];
      recentByPoint.set(point, bucket);
    }
    if (bucket.length < RECENT_PER_POINT) {
      bucket.push(row.isCorrect);
    }
  }

  const labels = Array.from(recentByPoint.keys()).sort((a, b) => a.localeCompare(b)).slice(0, MAX_GRAMMAR_POINTS);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Grammar mastery</h3>
      <p className="text-sm text-gray-500 mb-4">
        Accuracy from up to {RECENT_PER_POINT} most recent answers per grammar label in question{" "}
        <code className="text-xs bg-gray-100 px-1 rounded">notes</code>. Non-grammar categories are ignored.
      </p>
      {labels.length === 0 ? (
        <p className="text-gray-400 text-sm">No answer history yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {labels.map((label) => {
            const rows = recentByPoint.get(label) ?? [];
            const attempts = rows.length;
            const accuracy = attempts > 0 ? rows.filter(Boolean).length / attempts : null;
            const pct = accuracy !== null ? Math.round(accuracy * 1000) / 10 : null;
            const tileClasses = accuracyStatusClasses(accuracy);

            return (
              <div key={label} className={`rounded-lg px-3 py-3 shadow-sm ${tileClasses}`}>
                <p className="text-xs font-medium line-clamp-3" title={label}>
                  {label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums">{pct !== null ? `${pct}%` : "—"}</p>
                <p className="text-xs opacity-90 mt-0.5">
                  {attempts} answer{attempts === 1 ? "" : "s"} (max {RECENT_PER_POINT})
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
