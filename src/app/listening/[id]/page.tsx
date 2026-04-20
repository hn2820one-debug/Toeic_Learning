import Link from "next/link";
import { notFound } from "next/navigation";

import BilingualHeading from "@/components/ui/BilingualHeading";
import AppCard from "@/components/ui/AppCard";
import { getOrCreateDevUser } from "@/lib/dev-user";
import { getListeningWorkbookForUser } from "@/lib/listening/workbook-loader";

import ListeningWorkbookClient from "../ListeningWorkbookClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ListeningWorkbookPage({ params }: PageProps) {
  const user = await getOrCreateDevUser();
  const data = await getListeningWorkbookForUser(params.id, user?.id ?? null);
  if (!data) {
    notFound();
  }

  return (
    <div>
      <BilingualHeading
        titleZh="Listening 練習本"
        titleEn="Listening workbook"
        descriptionZh="跟住步驟：先聽 → 題目 → 重聽 → 對稿 → 口筆操 → 回顧。"
        descriptionEn="Workbook-first flow — video opens externally."
      />

      <div className="mb-6">
        <Link href="/listening" className="text-sm font-semibold text-primary-700 underline">
          ← 返回列表 · Back to list
        </Link>
      </div>

      {!user ? (
        <AppCard className="mb-6 border-amber-200 bg-amber-50/90">
          <p className="text-sm text-amber-950">未登入：可閱讀題本，進度唔會寫入。</p>
        </AppCard>
      ) : null}

      <ListeningWorkbookClient workbook={data.workbook} progress={data.progress} />
    </div>
  );
}
