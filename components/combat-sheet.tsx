"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCw, ShieldAlert, Sun, Timer, X } from "lucide-react";
import {
  ARENAS,
  GATE_RANKS,
  getPrescribedWorkout,
  SPLITS,
  type ArenaId,
  type GateRankId,
  type SplitId,
} from "@/lib/monarch-catalog";
import { epley1Rm, useMonarchStore } from "@/lib/monarch-store";
import {
  playLevelUp,
  playQuestComplete,
  playShadowArise,
  playSystemPing,
} from "@/lib/sounds";
import { useToastStore } from "@/components/ui/system-toast";

interface CombatSheetProps {
  open: boolean;
  onClose: () => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function CombatSheet({ open, onClose }: CombatSheetProps) {
  const split = useMonarchStore((s) => s.split);
  const arena = useMonarchStore((s) => s.arena);
  const gateRank = useMonarchStore((s) => s.gateRank);
  const benchBest = useMonarchStore((s) => s.benchBest);
  const swappedExercises = useMonarchStore((s) => s.swappedExercises);
  const toggleExerciseSwap = useMonarchStore((s) => s.toggleExerciseSwap);
  const completeGateWorkout = useMonarchStore((s) => s.completeGateWorkout);
  const addToast = useToastStore((s) => s.add);

  const exercises = useMemo(
    () => getPrescribedWorkout(arena, split, gateRank),
    [arena, split, gateRank]
  );

  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [benchWeight, setBenchWeight] = useState<number>(benchBest.weightKg || 55);
  const [benchReps, setBenchReps] = useState<number>(8);
  const [restLeft, setRestLeft] = useState<number>(0);
  const [wakeActive, setWakeActive] = useState<boolean>(false);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);

  // Reset checklist state when opening or changing workout key
  useEffect(() => {
    if (!open) return;
    const init: Record<string, boolean[]> = {};
    exercises.forEach((ex) => {
      const count = swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
      init[ex.id] = Array.from({ length: count }, () => false);
    });
    setCompletedSets(init);
    setRestLeft(0);
  }, [open, arena, split, gateRank]);

  // Keep S25 Ultra awake while inside Combat Sheet
  useEffect(() => {
    if (!open) {
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
      setWakeActive(false);
      return;
    }
    let cancelled = false;
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((sentinel) => {
        if (cancelled) {
          sentinel.release().catch(() => {});
        } else {
          wakeRef.current = sentinel;
          setWakeActive(true);
        }
      })
      .catch(() => setWakeActive(false));

    return () => {
      cancelled = true;
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, [open]);

  // Countdown rest timer
  useEffect(() => {
    if (restLeft <= 0) return;
    const id = setInterval(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          try {
            navigator.vibrate?.([140, 80, 220]);
          } catch {
            // ignore
          }
          playSystemPing();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restLeft]);

  if (!open) return null;

  const totalSets = exercises.reduce((acc, ex) => {
    const arr = completedSets[ex.id];
    return acc + (arr ? arr.length : ex.sets);
  }, 0);

  const doneSets = exercises.reduce((acc, ex) => {
    const arr = completedSets[ex.id] ?? [];
    return acc + arr.filter(Boolean).length;
  }, 0);

  const arenaSpec = ARENAS.find((a) => a.id === arena) ?? ARENAS[0];
  const splitSpec = SPLITS.find((s) => s.id === split) ?? SPLITS[0];
  const rankSpec = GATE_RANKS.find((g) => g.id === gateRank) ?? GATE_RANKS[1];

  function toggleSet(exId: string, setIdx: number, restSec: number) {
    setCompletedSets((prev) => {
      const current = prev[exId] ?? [];
      const nextArr = [...current];
      const turningOn = !nextArr[setIdx];
      nextArr[setIdx] = turningOn;
      if (turningOn) {
        try {
          navigator.vibrate?.(40);
        } catch {
          // ignore
        }
        playSystemPing();
        if (restSec > 0) setRestLeft(restSec);
      }
      return { ...prev, [exId]: nextArr };
    });
  }

  function handleSwap(exId: string, name: string) {
    toggleExerciseSwap(exId);
    playShadowArise();
    addToast({
      title: "IRON SWAP INVOKED",
      message: `Swapped station: ${name}`,
      variant: "quest",
      duration: 2400,
    });
  }

  function handleComplete() {
    const hasBench = exercises.some((e) => e.trackBench && !swappedExercises[e.id]);
    const res = completeGateWorkout({
      split: split as SplitId,
      arena: arena as ArenaId,
      gateRank: gateRank as GateRankId,
      setsCompleted: Math.max(doneSets, totalSets),
      benchWeightKg: hasBench ? benchWeight : undefined,
      benchReps: hasBench ? benchReps : undefined,
    });
    if (res.isPr) {
      playLevelUp();
      addToast({
        title: `NEW BENCH 1RM RECORD: ${res.newE1rm} KG`,
        message: `Vulcan's Anvil struck · +${res.xpAwarded} XP (PR Crit!)`,
        variant: "warning",
      });
    } else {
      playQuestComplete();
      addToast({
        title: `${rankSpec.tag} GATE SWEPT`,
        message: `${Math.max(doneSets, totalSets)} sets logged · +${res.xpAwarded} XP`,
        variant: "success",
      });
    }
    onClose();
  }

  const est1Rm = epley1Rm(benchWeight, benchReps);
  const mins = Math.floor(restLeft / 60);
  const secs = String(restLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              {rankSpec.tag} · {splitSpec.label} · {arenaSpec.shortLabel}
            </span>
            {wakeActive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-[family-name:var(--font-geist-mono)] text-[9px]">
                <Sun size={10} /> AWAKE
              </span>
            )}
          </div>
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-secondary)]">
            {doneSets}/{totalSets} SETS SWEPT · +{rankSpec.baseXp} XP
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)]"
          aria-label="Close combat HUD"
        >
          <X size={18} />
        </button>
      </div>

      {/* Arena Guardrail & Rest Bar */}
      <div className="px-4 py-2 bg-[var(--surface-1)]/60 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
          {split === "pool_steps"
            ? "PROTOCOL LOCK: Lift BEFORE CG Swimming Pool. Keep Zone-2 steady."
            : arenaSpec.rule}
        </p>
        {restLeft > 0 && (
          <button
            onClick={() => setRestLeft(0)}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3b6cf6]/20 border border-[#3b6cf6]/50 font-[family-name:var(--font-geist-mono)] text-xs font-bold text-[#3b6cf6]"
          >
            <Timer size={12} /> {mins}:{secs} <span className="text-[9px] opacity-75">SKIP</span>
          </button>
        )}
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-28 max-w-lg w-full mx-auto">
        {exercises.map((ex, idx) => {
          const isSwapped = Boolean(swappedExercises[ex.id]);
          const activeName = isSwapped ? ex.swap.name : ex.name;
          const activeSets = isSwapped ? ex.swap.sets : ex.sets;
          const activeReps = isSwapped ? ex.swap.reps : ex.reps;
          const activeLoad = isSwapped ? ex.swap.load : ex.load;
          const activeCue = isSwapped ? ex.swap.cue : ex.cue;
          const checks = completedSets[ex.id] ?? Array.from({ length: activeSets }, () => false);

          return (
            <div
              key={ex.id}
              className={`rounded-xl p-3.5 border ${
                isSwapped
                  ? "bg-[#151024] border-[#8b5cf6]/40"
                  : "bg-[var(--surface-1)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)]">
                      0{idx + 1}
                    </span>
                    <h3 className="font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-wide">
                      {activeName}
                    </h3>
                  </div>
                  <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[#3b6cf6] mt-0.5">
                    {activeSets} x {activeReps} · {activeLoad}
                  </p>
                </div>

                <button
                  onClick={() => handleSwap(ex.id, activeName)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-[family-name:var(--font-rajdhani)] font-bold uppercase tracking-wider border ${
                    isSwapped
                      ? "bg-[#8b5cf6]/25 border-[#8b5cf6] text-[#c4b5fd]"
                      : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  <RefreshCw size={10} /> {isSwapped ? "REVERT" : "IRON SWAP"}
                </button>
              </div>

              {activeCue && (
                <p className="mt-1.5 text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
                  <ShieldAlert size={12} className="shrink-0 mt-0.5 text-[#f59e0b]" />
                  <span>{activeCue}</span>
                </p>
              )}

              {/* Inline Bench PR Control */}
              {ex.trackBench && !isSwapped && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--surface-2)] border border-[#f59e0b]/25 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">
                      VULCAN 100 KG LADDER (e1RM: {est1Rm} KG)
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Prev best: {benchBest.weightKg}kg x {benchBest.reps} ({benchBest.e1rm}kg e1RM)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-[family-name:var(--font-geist-mono)] text-xs">
                    <button
                      onClick={() => setBenchWeight((w) => Math.max(20, w - 2.5))}
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      -
                    </button>
                    <span>{benchWeight}kg</span>
                    <button
                      onClick={() => setBenchWeight((w) => w + 2.5)}
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      +
                    </button>
                    <span className="text-[var(--text-muted)]">x</span>
                    <button
                      onClick={() => setBenchReps((r) => Math.max(1, r - 1))}
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      -
                    </button>
                    <span>{benchReps}</span>
                    <button
                      onClick={() => setBenchReps((r) => r + 1)}
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Set Taps */}
              <div className="mt-3 flex flex-wrap gap-2">
                {checks.map((done, setIdx) => (
                  <button
                    key={setIdx}
                    onClick={() => toggleSet(ex.id, setIdx, ex.restSec)}
                    className={`h-9 min-w-[64px] px-3 rounded-lg font-[family-name:var(--font-geist-mono)] text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                      done
                        ? "bg-[#22c55e]/20 border-[#22c55e] text-[#4ade80]"
                        : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {done && <Check size={12} />}
                    S{setIdx + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Complete Bar */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[var(--surface-0)]/95 border-t border-[var(--border-subtle)] backdrop-blur-md">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={handleComplete}
            className="flex-1 h-12 rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-white shadow-[0_0_24px_rgba(59,108,246,0.35)]"
          >
            COMPLETE GATE · +{rankSpec.baseXp} XP
          </button>
        </div>
      </div>
    </div>
  );
}
