"use client";

import { useEffect, useRef, useState } from "react";

type TestQuestionTimerProps = {
  resetKey: string | number;
  totalSec: number;
  active: boolean;
  onExpire: () => void;
  className?: string;
};

/**
 * Countdown with seconds + horizontal bar (checkpoint UX). One interval per activation.
 */
export default function TestQuestionTimer({ resetKey, totalSec, active, onExpire, className }: TestQuestionTimerProps) {
  const [remainSec, setRemainSec] = useState(totalSec);
  const expiredRef = useRef(false);
  const deadlineRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredRef.current = false;
    if (!active) {
      setRemainSec(totalSec);
      return;
    }

    const start = Date.now();
    deadlineRef.current = start + totalSec * 1000;
    setRemainSec(totalSec);

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainSec(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [resetKey, totalSec, active]);

  const pct = totalSec > 0 ? (remainSec / totalSec) * 100 : 0;

  return (
    <div className={className ?? "w-full max-w-xs space-y-2"}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
        <div
          className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="flex items-baseline justify-end gap-0.5 text-slate-800"
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Remaining time ${remainSec} seconds`}
      >
        <span className="tabular-nums text-lg font-semibold">{remainSec}</span>
        <span className="text-sm text-slate-600">s</span>
      </div>
    </div>
  );
}
