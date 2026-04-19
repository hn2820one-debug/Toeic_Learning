import Link from "next/link";

import { normalizeTopic } from "@/lib/elo";
import { prisma } from "@/lib/prisma";

const MAX_TOPICS = 29;

function topicFlagTileClasses(flag: string) {
  switch (flag) {
    case "Weak":
      return "bg-red-500 text-white hover:bg-red-600";
    case "Mixed":
      return "bg-orange-500 text-white hover:bg-orange-600";
    case "Fair":
      return "bg-yellow-300 text-gray-900 hover:bg-yellow-400";
    case "Strong":
      return "bg-green-600 text-white hover:bg-green-700";
    default:
      return "bg-gray-300 text-gray-800 hover:bg-gray-400";
  }
}

export default async function TopicMasteryGrid() {
  const [topicRows, eloTopicRows, questionTopicGroups] = await Promise.all([
    prisma.topicMastery.findMany(),
    prisma.eloState.findMany({
      where: { kind: "user_topic" },
      select: { subjectId: true, rating: true, n: true },
    }),
    prisma.questionBankItem.groupBy({
      by: ["topic"],
      _count: { _all: true },
    }),
  ]);

  const displayByKey = new Map<string, string>();

  for (const row of topicRows) {
    const key = normalizeTopic(row.topic);
    if (!displayByKey.has(key)) {
      displayByKey.set(key, row.topic.trim());
    }
  }

  for (const g of questionTopicGroups) {
    const key = normalizeTopic(g.topic);
    if (!displayByKey.has(key)) {
      displayByKey.set(key, g.topic.trim());
    }
  }

  for (const row of eloTopicRows) {
    if (!displayByKey.has(row.subjectId)) {
      displayByKey.set(row.subjectId, row.subjectId);
    }
  }

  const allKeys = Array.from(
    new Set([
      ...topicRows.map((r) => normalizeTopic(r.topic)),
      ...questionTopicGroups.map((g) => normalizeTopic(g.topic)),
      ...eloTopicRows.map((r) => r.subjectId),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const topicKeys = allKeys.slice(0, MAX_TOPICS);

  const masteryByKey = new Map(topicRows.map((r) => [normalizeTopic(r.topic), r]));
  const eloByKey = new Map(eloTopicRows.map((r) => [r.subjectId, r]));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Topic mastery</h3>
      <p className="text-sm text-gray-500 mb-4">
        Up to {MAX_TOPICS} topics from your bank and ELO. Colors follow TopicMastery flags; topics without mastery
        records are grey.
      </p>
      {topicKeys.length === 0 ? (
        <p className="text-gray-400 text-sm">No topics in the question bank yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {topicKeys.map((key) => {
            const mastery = masteryByKey.get(key) ?? null;
            const elo = eloByKey.get(key);
            const displayName = displayByKey.get(key) ?? key;
            const ratingLabel =
              elo !== undefined ? String(Math.round(elo.rating * 10) / 10) : "—";
            const attempts = mastery?.attempts ?? 0;
            const hasMastery = mastery !== null;
            const tileClasses = hasMastery ? topicFlagTileClasses(mastery.flag) : "bg-gray-300 text-gray-800 hover:bg-gray-400";

            return (
              <Link
                key={key}
                href={`/questions?topic=${encodeURIComponent(displayName)}`}
                className={`block rounded-lg px-3 py-3 text-left shadow-sm transition-colors ${tileClasses}`}
              >
                <p className="text-xs font-medium line-clamp-2" title={displayName}>
                  {displayName}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums">{ratingLabel}</p>
                <p className="text-xs opacity-90 mt-0.5">{attempts} attempt{attempts === 1 ? "" : "s"}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
