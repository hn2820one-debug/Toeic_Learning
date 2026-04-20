"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { primaryButtonClass } from "@/lib/ui/form-classes";

import { createListeningWorkbook } from "./actions";

export default function CreateWorkbookForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      action={(fd) => {
        setErr(null);
        startTransition(() => {
          void createListeningWorkbook(fd).then((r) => {
            if (r.ok && r.id) {
              router.push(`/listening/${r.id}`);
              router.refresh();
            } else {
              setErr(!r.ok ? r.error : "failed");
            }
          });
        });
      }}
    >
      <div>
        <label className="text-xs font-semibold text-slate-600">標題 · Title</label>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="例如：BBC 6 Minute English — Small talk"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">來源標籤（選填）· Source label</label>
        <input
          name="sourceLabel"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="YouTube · 頻道名"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">影片 URL · Video URL</label>
        <input
          name="sourceUrl"
          type="url"
          required
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">起始秒 · Start (sec)</label>
          <input
            name="startSec"
            type="number"
            step="0.1"
            min="0"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">結束秒 · End (sec)</label>
          <input
            name="endSec"
            type="number"
            step="0.1"
            min="0"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="可留空"
          />
        </div>
      </div>
      {err ? <p className="text-sm text-rose-700">{err}</p> : null}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        建立練習本 · Create workbook
      </button>
    </form>
  );
}
