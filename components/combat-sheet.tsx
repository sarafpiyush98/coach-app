"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sun,
  Timer,
  X,
} from "lucide-react";
import {
  ARENAS,
  GATE_RANKS,
  getPrescribedWorkout,
  SPLITS,
  type ArenaId,
  type GateRankId,
  type SplitId,
} from "@/lib/monarch-catalog";
import { epley1Rm, getTodayKey, useMonarchStore } from "@/lib/monarch-store";
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

export function formatRestDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function CombatSheet({ open, onClose }: CombatSheetProps) {
  const split = useMonarchStore((s) => s.split);
  const arena = useMonarchStore((s) => s.arena);
  const gateRank = useMonarchStore((s) => s.gateRank);
  const benchBest = useMonarchStore((s) => s.benchBest);
  const swappedExercises = useMonarchStore((s) => s.swappedExercises);
  const activeSession = useMonarchStore((s) => s.activeSession);
  const toggleExerciseSwap = useMonarchStore((s) => s.toggleExerciseSwap);
  const syncActiveSession = useMonarchStore((s) => s.syncActiveSession);
  const toggleActiveSet = useMonarchStore((s) => s.toggleActiveSet);
  const clearActiveRestTimer = useMonarchStore((s) => s.clearActiveRestTimer);
  const discardActiveSession = useMonarchStore((s) => s.discardActiveSession);
  const completeGateWorkout = useMonarchStore((s) => s.completeGateWorkout);
  const addToast = useToastStore((s) => s.add);

  const exercises = useMemo(
    () => getPrescribedWorkout(arena, split, gateRank),
    [arena, split, gateRank]
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [wakeActive, setWakeActive] = useState<boolean>(false);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);
  const pingedRestAtRef = useRef<number | null>(null);

  const todayKey = getTodayKey();

  // Initialize or seamlessly resume IndexedDB activeSession
  useEffect(() => {
    if (!open) return;
    const hasProgressToday =
      activeSession &&
      activeSession.date === todayKey &&
      Object.values(activeSession.completedSets).some((arr) => arr.some(Boolean));

    const matchesCurrent =
      activeSession &&
      activeSession.date === todayKey &&
      activeSession.split === split &&
      activeSession.arena === arena &&
      activeSession.gateRank === gateRank;

    if (!activeSession || activeSession.date !== todayKey) {
      syncActiveSession({ reset: true, split, arena, gateRank });
    } else if (!matchesCurrent && !hasProgressToday) {
      syncActiveSession({ reset: true, split, arena, gateRank });
    }
  }, [open, arena, split, gateRank, todayKey]);

  // Keep S25 Ultra awake & auto-reacquire when returning from WhatsApp/Spotify
  useEffect(() => {
    if (!open) {
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
      setWakeActive(false);
      return;
    }

    let cancelled = false;
    const requestWake = () => {
      if (cancelled || document.visibilityState !== "visible") return;
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
    };

    requestWake();
    const onVis = () => {
      if (document.visibilityState === "visible") requestWake();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, [open]);

  // Wall-clock count-up rest stopwatch (immune to background throttling & never expires)
  const lastSetAtMs = activeSession?.lastSetAtMs ?? null;
  useEffect(() => {
    if (!open || !lastSetAtMs) return;
    setNowMs(Date.now());
    const id = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      const sec = Math.floor((now - lastSetAtMs) / 1000);
      if (sec >= 150 && pingedRestAtRef.current !== lastSetAtMs) {
        pingedRestAtRef.current = lastSetAtMs;
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          // ignore
        }
        playSystemPing();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [open, lastSetAtMs]);

  // Dismiss modal cleanly with Escape key
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const benchWeight = activeSession?.benchWeight ?? (benchBest.weightKg || 55);
  const benchReps = activeSession?.benchReps ?? 8;
  const completedSets = activeSession?.completedSets ?? {};

  const totalSets = exercises.reduce((acc, ex) => {
    const count = swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
    return acc + count;
  }, 0);

  const doneSets = exercises.reduce((acc, ex) => {
    const count = swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
    const arr = completedSets[ex.id] ?? [];
    return acc + arr.slice(0, count).filter(Boolean).length;
  }, 0);

  const elapsedRestSec =
    lastSetAtMs !== null ? Math.max(0, Math.floor((nowMs - lastSetAtMs) / 1000)) : null;

  const restPhase =
    elapsedRestSec === null
      ? null
      : elapsedRestSec < 120
        ? { label: "RECOVERING", color: "text-[var(--text-secondary)]", border: "border-[var(--border-subtle)] bg-[var(--surface-2)]" }
        : elapsedRestSec < 270
          ? { label: "ATP FULL", color: "text-[#60a5fa]", border: "border-[#3b6cf6]/60 bg-[#3b6cf6]/15" }
          : { label: "LONG REST · READY", color: "text-[#fbbf24]", border: "border-[#f59e0b]/60 bg-[#f59e0b]/15" };

  const arenaSpec = ARENAS.find((a) => a.id === arena) ?? ARENAS[0];
  const splitSpec = SPLITS.find((s) => s.id === split) ?? SPLITS[0];
  const rankSpec = GATE_RANKS.find((g) => g.id === gateRank) ?? GATE_RANKS[1];

  function handleSetTap(exId: string, setIdx: number, totalSetsForEx: number) {
    const { turnedOn } = toggleActiveSet({
      split,
      arena,
      gateRank,
      exId,
      setIdx,
      totalSetsForEx,
    });
    if (turnedOn) {
      setNowMs(Date.now());
      try {
        navigator.vibrate?.(40);
      } catch {
        // ignore
      }
      playSystemPing();
    }
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Combat HUD"
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface-0)] text-[var(--text-primary)]"
    >
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
            {doneSets}/{totalSets} SETS SWEPT · SAVED OFFLINE · +{rankSpec.baseXp} XP
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {doneSets > 0 && (
            <button
              onClick={discardActiveSession}
              className="h-9 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase text-[var(--text-secondary)] inline-flex items-center gap-1"
              title="Reset checked sets"
            >
              <RotateCcw size={11} /> RESET
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)]"
            aria-label="Close combat HUD"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Arena Guardrail + Wall-Clock Count-Up Rest Stopwatch */}
      <div className="px-4 py-2 bg-[var(--surface-1)]/60 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
          {split === "pool_steps"
            ? "PROTOCOL LOCK: Lift BEFORE CG Swimming Pool. Keep Zone-2 steady."
            : arenaSpec.rule}
        </p>

        {elapsedRestSec !== null && restPhase && (
          <div
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-[family-name:var(--font-geist-mono)] text-[11px] font-bold ${restPhase.border} ${restPhase.color}`}
          >
            <Timer size={12} />
            <span>{formatRestDuration(elapsedRestSec)}</span>
            <span className="text-[9px] font-[family-name:var(--font-rajdhani)] uppercase tracking-wider">
              {restPhase.label}
            </span>
            <button
              onClick={clearActiveRestTimer}
              className="ml-1 text-[9px] opacity-70 hover:opacity-100 underline"
            >
              CLR
            </button>
          </div>
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
          const savedArr = completedSets[ex.id] ?? [];
          const checks = Array.from({ length: activeSets }, (_, i) => Boolean(savedArr[i]));

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

              {!isSwapped && ex.pairHint && (
                <p className="mt-1 text-[10px] text-[#c4b5fd] flex items-start gap-1.5">
                  <Sparkles size={11} className="shrink-0 mt-0.5" />
                  <span>{ex.pairHint}</span>
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
                      onClick={() =>
                        syncActiveSession({ benchWeight: Math.max(20, benchWeight - 2.5) })
                      }
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      -
                    </button>
                    <span>{benchWeight}kg</span>
                    <button
                      onClick={() => syncActiveSession({ benchWeight: benchWeight + 2.5 })}
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      +
                    </button>
                    <span className="text-[var(--text-muted)]">x</span>
                    <button
                      onClick={() =>
                        syncActiveSession({ benchReps: Math.max(1, benchReps - 1) })
                      }
                      className="px-2 py-1 rounded bg-[var(--surface-1)]"
                    >
                      -
                    </button>
                    <span>{benchReps}</span>
                    <button
                      onClick={() => syncActiveSession({ benchReps: benchReps + 1 })}
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
                    onClick={() => handleSetTap(ex.id, setIdx, activeSets)}
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
