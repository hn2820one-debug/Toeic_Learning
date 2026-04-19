import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { abandonActiveSessionAction } from "@/app/training/actions";
import { ACTIVE_SESSION_COOKIE_NAME, getActiveSessionBannerState, getTrainingHref } from "@/lib/training";

export const metadata: Metadata = {
  title: "TOEIC Trainer",
  description: "Personal TOEIC study system",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSessionCookie = cookies().get(ACTIVE_SESSION_COOKIE_NAME)?.value;
  const activeSession = await getActiveSessionBannerState(activeSessionCookie);

  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-[#f4f6fb] antialiased text-slate-900">
        <Sidebar />
        <main className="ml-[220px] min-h-screen border-l border-slate-200/70 bg-gradient-to-br from-white via-[#f7f9fd] to-[#eef2fa] p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
          {activeSession ? (
            <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">繼續訓練 · Resume session</p>
                <p className="mt-1 text-amber-900/90">
                  進度 {activeSession.answeredCount} / {activeSession.targetCount} 題 · Progress
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={getTrainingHref({ sessionId: activeSession.sessionId })}
                  className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
                >
                  繼續 · Continue
                </Link>

                <form action={abandonActiveSessionAction}>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
                  >
                    放棄 · Abandon
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {children}
          </div>
        </main>
      </body>
    </html>
  );
}
