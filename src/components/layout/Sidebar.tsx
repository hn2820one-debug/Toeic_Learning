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
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/training", label: "Daily Training", icon: Dumbbell },
  { href: "/questions", label: "Question Bank", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/report", label: "Weekly Report", icon: BarChart2 },
  { href: "/import", label: "Import", icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">TOEIC Trainer</h1>
        <p className="text-xs text-gray-400 mt-0.5">Target: 750+</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        Keith · L:315 R:255
      </div>
    </aside>
  );
}
