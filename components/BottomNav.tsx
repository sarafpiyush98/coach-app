"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  BarChart3,
  CalendarDays,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/log/meal", label: "Meal", icon: UtensilsCrossed },
  { href: "/log/workout", label: "Workout", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/history", label: "History", icon: CalendarDays },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(245,158,11,0.08)] bg-[#050A14]/95 backdrop-blur-lg">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-amber-400"
                  : "text-[#4B5563] hover:text-[#9CA3AF]"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={isActive ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" : ""}
              />
              <span className={`text-[10px] font-medium ${isActive ? "glow-amber" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
