"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  User,
  Swords,
  ScrollText,
  Lock,
} from "lucide-react";
import { useLevelStore } from "@/lib/level-store";

const NAV_ITEMS = [
  { href: "/", label: "SYSTEM", icon: LayoutDashboard, minLevel: 1 },
  { href: "/log/meal", label: "FUEL", icon: UtensilsCrossed, minLevel: 1 },
  { href: "/status", label: "STATUS", icon: User, minLevel: 5 },
  { href: "/progress", label: "DUNGEON", icon: Swords, minLevel: 10 },
  { href: "/history", label: "RECORDS", icon: ScrollText, minLevel: 1 },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const level = useLevelStore((s) => s.level);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, minLevel }) => {
          const isActive = pathname === href;
          const locked = level < minLevel;

          if (locked) {
            return (
              <div
                key={href}
                className="flex flex-col items-center gap-0.5 px-4 py-2 relative opacity-20"
              >
                <Icon size={18} />
                <span className="font-[family-name:var(--font-rajdhani)] text-[8px] font-bold uppercase tracking-wider">
                  LV {minLevel}
                </span>
                <Lock size={8} className="absolute -top-0.5 -right-0.5" />
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors duration-200 cursor-pointer ${
                isActive
                  ? "text-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-wider"
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
