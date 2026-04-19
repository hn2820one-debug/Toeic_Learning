import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma";

async function run() {
  const adapter = new PrismaLibSql({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter } as never);
  const s = await prisma.studySession.create({ data: { startedAt: new Date() }, select: { id: true } });
  const qs = await prisma.questionBankItem.findMany({ select: { id: true }, take: 5, orderBy: { id: "asc" } });
  console.log("SESSION=" + s.id + " IDS=" + qs.map((q: { id: number }) => q.id).join(","));
  await prisma.$disconnect();
}
run().catch(console.error);
