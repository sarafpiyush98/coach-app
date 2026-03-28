"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "glow-blue border-[#1B45D7]/30",
  warning: "glow-gold border-[#FFC107]/30",
  danger: "glow-red border-[#D50000]/30",
  success: "glow-blue border-[#059669]/30",
  gold: "glow-gold border-[#FFC107]/30",
  purple: "glow-purple border-[#463671]/30",
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
    "relative rounded-lg border",
    "bg-[rgba(10,20,60,0.85)] backdrop-blur-[16px]",
    variantStyles[variant],
    className
  );

  const content = (
    <>
      {/* Scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 2px, rgba(27,69,215,0.03) 4px)",
        }}
      />
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
