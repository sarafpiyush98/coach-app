"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const variantStyles = {
  default:
    "bg-[var(--surface-1)] border border-[var(--border-subtle)]",
  hero:
    "bg-[var(--surface-2)] border-t-2 border-t-[var(--accent-blue)] border-x border-b border-x-[var(--border-subtle)] border-b-[var(--border-subtle)] shadow-[0_4px_24px_var(--accent-glow)]",
  interactive:
    "bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] hover:border-[var(--border-accent)] transition-colors",
  ghost:
    "bg-transparent border-none",
  success:
    "bg-[var(--surface-1)] border border-[var(--border-subtle)] border-l-4 border-l-[var(--success)]",
  danger:
    "bg-[var(--surface-1)] border border-[var(--border-subtle)] border-l-4 border-l-[var(--danger)]",
  gold:
    "bg-[var(--surface-1)] border border-[var(--border-subtle)] border-l-4 border-l-[var(--warning)]",
} as const;

type Variant = keyof typeof variantStyles;

interface SystemPanelProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
  animate?: boolean;
}

export function SystemPanel({
  variant = "default",
  className,
  children,
  animate = true,
}: SystemPanelProps) {
  const classes = cn(
    "relative rounded-lg",
    variantStyles[variant],
    className
  );

  const content = (
    <>
      {/* Scanline overlay — hero only */}
      {variant === "hero" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 2px, rgba(59,108,246,0.02) 4px)",
          }}
        />
      )}
      <div className="relative z-[2]">{children}</div>
    </>
  );

  if (!animate) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={classes}
    >
      {content}
    </motion.div>
  );
}
