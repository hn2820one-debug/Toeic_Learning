"use client";

import { useEffect, useRef, useState } from "react";

type QuestionTimerProps = {
  /** Changes when the learner moves to another question — resets the deadline */
  resetKey: string | number;
  totalSec: number;
  /** When false, interval is cleared (e.g. after submit) */
  active: boolean;
  onExpire: () => void;
  className?: string;
};

/**
 * Countdown using one `setInterval` with cleanup on unmount / `resetKey` / `active` change.
 * Avoids stacking intervals and calls `onExpire` at most once per activation cycle.
 */
export default function QuestionTimer({ resetKey, totalSec, active, onExpire, className }: QuestionTimerProps) {
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

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Remaining time ${remainSec} seconds`}
    >
      <span className="tabular-nums font-semibold">{remainSec}</span>
      <span className="text-slate-600">s</span>
    </div>
  );
}
