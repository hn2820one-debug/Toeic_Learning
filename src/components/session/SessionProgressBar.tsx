type SessionProgressBarProps = {
  current: number;
  total: number;
  className?: string;
};

export default function SessionProgressBar({ current, total, className }: SessionProgressBarProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const pct = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>
          題目進度 {safeCurrent}/{safeTotal}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-primary-600 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
          aria-label={`progress ${pct}%`}
        />
      </div>
    </div>
  );
}

