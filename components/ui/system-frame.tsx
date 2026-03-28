"use client";

import { cn } from "@/lib/utils";

interface SystemFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function SystemFrame({ children, className }: SystemFrameProps) {
  return (
    <div className={cn("relative p-5", className)}>
      {/* Top-left bracket */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-[1.5px] border-l-[1.5px] border-[var(--accent-blue)]/40"
      />
      {/* Top-right bracket */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-5 h-5 border-t-[1.5px] border-r-[1.5px] border-[var(--accent-blue)]/40"
      />
      {/* Bottom-left bracket */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-5 h-5 border-b-[1.5px] border-l-[1.5px] border-[var(--accent-blue)]/40"
      />
      {/* Bottom-right bracket */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-5 h-5 border-b-[1.5px] border-r-[1.5px] border-[var(--accent-blue)]/40"
      />
      {children}
    </div>
  );
}
