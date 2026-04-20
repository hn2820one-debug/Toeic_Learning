"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  History,
  BarChart2,
  Upload,
  GraduationCap,
  Map,
  Headphones,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  zh: string;
  en: string;
  icon: LucideIcon;
  /** Highlight when pathname starts with `href/` (e.g. /listening/[id]). */
  prefixMatch?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", zh: "儀表板", en: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", zh: "今日學習", en: "Today's learning", icon: GraduationCap },
  { href: "/progress", zh: "能力地圖", en: "Mastery map", icon: Map },
  { href: "/listening", zh: "聽力題本", en: "Listening", icon: Headphones, prefixMatch: true },
  { href: "/training", zh: "每日訓練", en: "Daily Training", icon: Dumbbell },
  { href: "/questions", zh: "題庫", en: "Question Bank", icon: BookOpen },
  { href: "/history", zh: "紀錄", en: "History", icon: History },
  { href: "/report", zh: "週報", en: "Weekly Report", icon: BarChart2 },
  { href: "/import", zh: "匯入", en: "Import", icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-900 via-slate-900 to-[#0d1530] text-slate-100 shadow-xl shadow-slate-900/30">
      <div className="border-b border-white/10 px-5 py-6">
        <h1 className="text-lg font-bold tracking-tight text-white">TOEIC Trainer</h1>
        <p className="mt-1 text-[11px] leading-snug text-primary-200/80">
          目標 750+ · Target: 750+
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, zh, en, icon: Icon, prefixMatch }) => {
          const active =
            pathname === href || (prefixMatch === true && pathname.startsWith(`${href}/`));
          return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-900/40 ring-1 ring-white/10"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon size={18} className="shrink-0 opacity-90" aria-hidden />
            <span className="flex min-w-0 flex-col leading-tight">
              <span>{zh}</span>
              <span
                className={clsx(
                  "text-[11px] font-normal",
                  active ? "text-primary-100" : "text-slate-400",
                )}
              >
                {en}
              </span>
            </span>
          </Link>
        );
        })}
      </nav>

      <div className="border-t border-slate-700/80 px-5 py-4 text-[11px] leading-relaxed text-slate-500">
        Keith · L:315 R:255
      </div>
    </aside>
  );
}
