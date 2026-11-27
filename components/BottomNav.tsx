"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, Target, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: CalendarCheck2 },
  { href: "/raids", label: "Goals", icon: Target },
  { href: "/status", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]/95 backdrop-blur-md">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors duration-150 ${
                isActive
                  ? "text-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.75} />
              <span className="font-sans text-[11px] font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
