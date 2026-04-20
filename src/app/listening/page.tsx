import Link from "next/link";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { listListeningWorkbooks } from "@/lib/listening/workbook-loader";

import CreateWorkbookForm from "./CreateWorkbookForm";

export const dynamic = "force-dynamic";

export default async function ListeningIndexPage() {
  const user = await getOrCreateDevUser();
  const books = user ? await listListeningWorkbooks() : [];

  return (
    <div>
      <BilingualHeading
        titleZh="Listening 練習本"
        titleEn="Listening workbook mode"
        descriptionZh="用外部影片連結 + 站內題本：唔自建影音平台，專注聽力小閉環。"
        descriptionEn="External video links, on-site workbook — no heavy in-app player."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <AppCard padding="md">
          <h2 className="text-lg font-semibold text-slate-900">新增 · New</h2>
          <p className="mt-1 text-sm text-slate-600">貼 YouTube 等連結，設定建議起訖秒數，即可開題本。</p>
          {user ? (
            <div className="mt-4">
              <CreateWorkbookForm />
            </div>
          ) : (
            <p className="mt-4 text-sm text-amber-800">需要學習者帳號才能建立練習本。</p>
          )}
        </AppCard>

        <AppCard padding="md" className="border-slate-200 bg-white/90">
          <h2 className="text-lg font-semibold text-slate-900">我的練習本 · Open</h2>
          {books.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">尚無項目。先建立一個，或跑資料庫 seed。</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {books.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/listening/${b.id}`}
                    className="block rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-50"
                  >
                    {b.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </div>
    </div>
  );
}
