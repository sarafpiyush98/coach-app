"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  User,
  Swords,
  ScrollText,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "SYSTEM", icon: LayoutDashboard },
  { href: "/log/meal", label: "FUEL", icon: UtensilsCrossed },
  { href: "/status", label: "STATUS", icon: User },
  { href: "/progress", label: "DUNGEON", icon: Swords },
  { href: "/history", label: "RECORDS", icon: ScrollText },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(27,69,215,0.12)] bg-[#050A14]/95 backdrop-blur-lg">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-[#1B45D7]"
                  : "text-[#4B5563] hover:text-[#9CA3AF]"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={isActive ? "drop-shadow-[0_0_6px_rgba(27,69,215,0.5)]" : ""}
              />
              <span
                className={`font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? "drop-shadow-[0_0_4px_rgba(27,69,215,0.4)]" : ""
                }`}
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
