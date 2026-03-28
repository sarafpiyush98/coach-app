"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { playSystemPing } from "@/lib/sounds";

/* ── Toast Store ────────────────────────────────────── */

interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: "info" | "warning" | "danger" | "success" | "quest";
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
  },
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ── Variant Styles ─────────────────────────────────── */

const accentColor = {
  info: "bg-[#1B45D7]",
  warning: "bg-[#FFC107]",
  danger: "bg-[#D50000]",
  success: "bg-[#059669]",
  quest: "bg-[#463671]",
} as const;

/* ── Single Toast ───────────────────────────────────── */

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    playSystemPing();
    const timer = setTimeout(() => remove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, remove]);

  return (
    <motion.div
      layout
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex overflow-hidden rounded-lg",
        "bg-[rgba(10,20,60,0.92)] backdrop-blur-[16px]",
        "border border-[#1B45D7]/20"
      )}
    >
      {/* Left accent bar */}
      <div className={cn("w-1 shrink-0", accentColor[toast.variant])} />

      <div className="px-4 py-3">
        <p className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[#FBEFFA]">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-[#4A5568]">{toast.message}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Toast Container (mount once in layout) ─────────── */

export function SystemToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
