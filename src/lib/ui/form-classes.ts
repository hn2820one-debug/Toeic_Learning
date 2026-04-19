/** Shared Tailwind classes for form inputs and buttons (visual consistency across pages). */
export const formInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 disabled:bg-slate-50 disabled:text-slate-500";

export const formTextareaClass = `${formInputClass} resize-y min-h-[5.5rem] leading-relaxed`;

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:pointer-events-none disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:pointer-events-none disabled:opacity-50";
