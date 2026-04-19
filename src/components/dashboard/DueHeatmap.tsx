import { prisma } from "@/lib/prisma";

function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DueHeatmap() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowEnd = new Date(today.getTime() + 30 * 86400_000);

  const cards = await prisma.fsrsCardState.findMany({
    where: {
      suspended: false,
      state: { in: ["Learning", "Review", "Relearning"] },
      due: {
        gte: today,
        lte: windowEnd,
      },
    },
    select: { due: true },
  });

  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getTime() + i * 86400_000);
    counts[localDateKey(d)] = 0;
  }

  for (const c of cards) {
    const key = localDateKey(c.due);
    if (counts[key] !== undefined) {
      counts[key]++;
    }
  }

  const entries = Object.entries(counts);
  const max = Math.max(...entries.map(([, n]) => n), 1);

  return (
    <div className="rounded-lg bg-white p-4 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-1">Upcoming 30 days</h3>
      <p className="text-xs text-gray-500 mb-3">FSRS due load (non-suspended, active states)</p>
      <div className="grid grid-cols-10 gap-1">
        {entries.map(([date, count]) => {
          const intensity = count / max;
          const bg =
            count === 0
              ? "bg-gray-100"
              : intensity > 0.7
                ? "bg-red-400"
                : intensity > 0.4
                  ? "bg-yellow-300"
                  : "bg-green-200";
          return (
            <div
              key={date}
              className={`${bg} aspect-square rounded text-xs flex items-center justify-center font-medium text-gray-800`}
              title={`${date}: ${count} cards`}
            >
              {count > 0 ? count : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
