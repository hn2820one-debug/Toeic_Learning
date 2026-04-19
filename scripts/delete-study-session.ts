/**
 * Deletes one StudySession and its AnswerHistory rows. StudySessionQuestion rows cascade from session.
 * Usage: npx tsx scripts/delete-study-session.ts <sessionId>
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const raw = process.argv[2];
  const sessionId = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(sessionId) || sessionId < 1) {
    console.error("Usage: npm run db:delete-session -- <sessionId>");
    process.exit(1);
  }

  const existing = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!existing) {
    console.error(`No StudySession with id=${sessionId}`);
    process.exit(1);
  }

  const deletedAh = await prisma.answerHistory.deleteMany({ where: { sessionId } });
  await prisma.studySession.delete({ where: { id: sessionId } });

  console.log(
    `Deleted StudySession id=${sessionId} (${deletedAh.count} answer_history row(s); session questions cascaded).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
