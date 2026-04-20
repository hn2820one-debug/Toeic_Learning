"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { warmupContinuationPath, type WarmupTargetFlow } from "@/lib/session/warmup";
import { primaryButtonClass } from "@/lib/ui/form-classes";

import { startWarmupSession } from "./actions";

type WarmupStartClientProps = {
  topicKey: string;
  flow: WarmupTargetFlow;
};

export default function WarmupStartClient({ topicKey, flow }: WarmupStartClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null);
          startTransition(() => {
            void startWarmupSession({ topicKey, flow }).then((r) => {
              if (r.ok && r.sessionId) {
                router.push(
                  `/warmup?topicKey=${encodeURIComponent(topicKey)}&flow=${encodeURIComponent(flow)}&session=${encodeURIComponent(r.sessionId)}&pos=0`,
                );
              } else {
                setErr(r.ok ? null : r.error ?? "failed");
              }
            });
          });
        }}
        className={primaryButtonClass}
      >
        開始熱身 · Start warm-up
      </button>
      <Link
        href={warmupContinuationPath(topicKey, flow)}
        className="text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-900"
      >
        跳過熱身，直接進入主線 · Skip
      </Link>
      {err ? <p className="w-full text-sm text-rose-700">{err}</p> : null}
    </div>
  );
}
