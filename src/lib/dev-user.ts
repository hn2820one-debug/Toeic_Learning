/**
 * Dev / bootstrap helpers for `User` rows. Safe from API routes & server actions.
 * Do not import from Client Components (uses Prisma).
 */
import { prisma } from "@/lib/prisma";

/** Stable dev-only email; not a real mailbox. */
export const DEV_USER_EMAIL = "dev@local.invalid";

export const DEFAULT_PROGRAM_KEY = "phase1";

/**
 * Whether implicit dev user creation is allowed (local dev or explicit opt-in).
 * Production stays opt-in so hosted deploys do not silently mint users.
 */
export function isImplicitDevUserAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_USER_BOOTSTRAP === "1";
}

async function ensureProfileAndEnrollment(userId: number) {
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, role: "LEARNER" },
    update: {},
  });

  await prisma.enrollment.upsert({
    where: {
      userId_programKey: { userId, programKey: DEFAULT_PROGRAM_KEY },
    },
    create: {
      userId,
      programKey: DEFAULT_PROGRAM_KEY,
      status: "active",
    },
    update: {},
  });
}

/**
 * Returns a persistent local learner row for development, or `null` when not allowed.
 * Claims the first existing `users` row by setting `email` to {@link DEV_USER_EMAIL} if none exists yet.
 * Does not run in production unless `ALLOW_DEV_USER_BOOTSTRAP=1`.
 */
export async function getOrCreateDevUser() {
  if (!isImplicitDevUserAllowed()) {
    return null;
  }

  let user = await prisma.user.findUnique({ where: { email: DEV_USER_EMAIL } });
  if (user) {
    await ensureProfileAndEnrollment(user.id);
    return user;
  }

  const first = await prisma.user.findFirst({ orderBy: { id: "asc" } });
  if (first) {
    user = await prisma.user.update({
      where: { id: first.id },
      data: { email: DEV_USER_EMAIL },
    });
    await ensureProfileAndEnrollment(user.id);
    return user;
  }

  user = await prisma.user.create({
    data: {
      email: DEV_USER_EMAIL,
      name: "Local Dev",
    },
  });
  await ensureProfileAndEnrollment(user.id);
  return user;
}

/** For training / server actions: attach `userId` in dev; omit in production until auth exists. */
export async function getDevUserIdForSession(): Promise<number | undefined> {
  const u = await getOrCreateDevUser();
  return u?.id;
}
