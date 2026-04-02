"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playRankUp } from "@/lib/sounds";

interface ComboMilestoneProps {
  comboDay: number;
  show: boolean;
  onDone: () => void;
}

const MILESTONES: Record<
  number,
  { title: string; subtitle: string; color: string; particles: number }
> = {
  7: {
    title: "SEVEN DAYS",
    subtitle: "The System has taken notice.",
    color: "#3b6cf6",
    particles: 20,
  },
  14: {
    title: "FOURTEEN DAYS",
    subtitle: "Consistency is the only hack.",
    color: "#8b5cf6",
    particles: 30,
  },
  21: {
    title: "TWENTY-ONE",
    subtitle: "Habit formed. The System approves.",
    color: "#a855f7",
    particles: 40,
  },
  30: {
    title: "THIRTY DAYS",
    subtitle: "You are no longer the same hunter.",
    color: "#f59e0b",
    particles: 50,
  },
  60: {
    title: "SIXTY DAYS",
    subtitle: "Most quit. You didn't.",
    color: "#ef4444",
    particles: 60,
  },
  90: {
    title: "NINETY DAYS",
    subtitle: "The System bows.",
    color: "#FFC107",
    particles: 80,
  },
};

function Particle({ delay, color }: { delay: number; color: string }) {
  const angle = Math.random() * 360;
  const distance = 100 + Math.random() * 200;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const size = 3 + Math.random() * 5;

  return (
    <motion.div
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{ duration: 1.5 + Math.random(), delay, ease: "easeOut" }}
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: "50%",
        top: "50%",
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
}

export function ComboMilestone({ comboDay, show, onDone }: ComboMilestoneProps) {
  const [visible, setVisible] = useState(false);
  const milestone = MILESTONES[comboDay];

  useEffect(() => {
    if (show && milestone) {
      setVisible(true);
      playRankUp();
      const timer = setTimeout(() => {
        setVisible(false);
        onDone();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, milestone, onDone]);

  if (!milestone) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {/* Particle burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {Array.from({ length: milestone.particles }, (_, i) => (
              <Particle key={i} delay={i * 0.02} color={milestone.color} />
            ))}
          </div>

          {/* Content */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="text-center relative z-10"
          >
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums uppercase tracking-[0.3em] mb-2"
              style={{ color: milestone.color }}
            >
              COMBO MILESTONE
            </motion.p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 8 }}
              className="font-[family-name:var(--font-geist-mono)] text-[64px] font-bold tabular-nums leading-none"
              style={{
                color: milestone.color,
                textShadow: `0 0 40px ${milestone.color}, 0 0 80px ${milestone.color}40`,
              }}
            >
              x{comboDay}
            </motion.p>
            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.15em] text-[var(--text-primary)] mt-3"
            >
              {milestone.title}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="font-[family-name:var(--font-rajdhani)] text-[11px] uppercase tracking-widest text-[var(--text-muted)] mt-1"
            >
              {milestone.subtitle}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
