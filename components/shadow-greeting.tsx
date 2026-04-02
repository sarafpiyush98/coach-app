"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSystemPing } from "@/lib/sounds";

interface ShadowGreetingProps {
  show: boolean;
  shadow: { name: string; message: string } | null;
  onDone: () => void;
}

const SHADOW_COLORS: Record<string, string> = {
  Iron: "#4A5568",
  Igris: "#EF4444",
  Tank: "#22C55E",
  Beru: "#8B5CF6",
  Tusk: "#F59E0B",
  Bellion: "#FFC107",
};

export function ShadowGreeting({ show, shadow, onDone }: ShadowGreetingProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && shadow) {
      setVisible(true);
      playSystemPing();
      const timer = setTimeout(() => {
        setVisible(false);
        onDone();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, shadow, onDone]);

  if (!shadow) return null;
  const color = SHADOW_COLORS[shadow.name] ?? "#3b6cf6";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div
            className="rounded-lg p-4 backdrop-blur-md border"
            style={{
              backgroundColor: `${color}10`,
              borderColor: `${color}40`,
              boxShadow: `0 0 30px ${color}20, inset 0 0 20px ${color}05`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: `${color}20`,
                  color,
                  boxShadow: `0 0 15px ${color}30`,
                }}
              >
                {shadow.name[0]}
              </div>
              <div>
                <p
                  className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em]"
                  style={{ color }}
                >
                  {shadow.name}
                </p>
                <p className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-wider text-[var(--text-primary)]">
                  {shadow.message}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
