"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Swords, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "GATE", icon: Shield },
  { href: "/raids", label: "RAIDS", icon: Swords },
  { href: "/status", label: "HUNTER", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]/95 backdrop-blur-md">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-6 py-2 transition-colors duration-150 ${
                isActive
                  ? "text-[var(--accent-blue)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 1.6} />
              <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-[0.14em]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
