"use client";

import { useCallback, useEffect, useState } from "react";

import { PREDICTION_PREF_STORAGE_KEY } from "@/lib/practice/prediction";

export function usePredictionPreference(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    try {
      setEnabledState(localStorage.getItem(PREDICTION_PREF_STORAGE_KEY) !== "false");
    } catch {
      setEnabledState(true);
    }
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(PREDICTION_PREF_STORAGE_KEY, next ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  return [enabled, setEnabled];
}

type PredictionPreferenceToggleProps = {
  className?: string;
};

/**
 * User preference: show think-first prediction step before formal choices (LEARN / PRACTICE).
 */
export default function PredictionPreferenceToggle({ className }: PredictionPreferenceToggleProps) {
  const [enabled, setEnabled] = usePredictionPreference();

  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600 ${className ?? ""}`}>
      <input
        type="checkbox"
        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        checked={enabled}
        onChange={() => setEnabled(!enabled)}
      />
      <span>預測步驟（先諗結構再睇選項）</span>
    </label>
  );
}
