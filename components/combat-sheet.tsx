"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Info,
  RefreshCw,
  RotateCcw,
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

function formatSplitHeading(id: SplitId): string {
  if (id === "upper_a") return "Upper A";
  if (id === "lower_a") return "Lower A";
  if (id === "upper_b") return "Upper B";
  if (id === "lower_b") return "Lower B";
  if (id === "full_body_plus") return "Full Body +";
  return "Jog & Pool";
}

export function CombatSheet({ open, onClose }: CombatSheetProps) {
  const split = useMonarchStore((s) => s.split);
  const arena = useMonarchStore((s) => s.arena);
  const gateRank = useMonarchStore((s) => s.gateRank);
  const benchBest = useMonarchStore((s) => s.benchBest);
  const exerciseLogs = useMonarchStore((s) => s.exerciseLogs);
  const swappedExercises = useMonarchStore((s) => s.swappedExercises);
  const activeSession = useMonarchStore((s) => s.activeSession);
  const toggleExerciseSwap = useMonarchStore((s) => s.toggleExerciseSwap);
  const syncActiveSession = useMonarchStore((s) => s.syncActiveSession);
  const setActiveDraftLoad = useMonarchStore((s) => s.setActiveDraftLoad);
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
  const [openTips, setOpenTips] = useState<Record<string, boolean>>({});
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

  const completedSets = activeSession?.completedSets ?? {};
  const draftLoads = activeSession?.draftLoads ?? {};

  function resolveDraft(ex: (typeof exercises)[number]) {
    const progKey = ex.progressKey ?? ex.id;
    const prev = exerciseLogs?.[progKey];
    const draft = draftLoads[progKey];
    const fallbackW = ex.trackBench
      ? (activeSession?.benchWeight ?? (prev?.lastWeightKg || benchBest.weightKg || 55))
      : (prev?.lastWeightKg ?? ex.defaultWeightKg ?? 20);
    const fallbackR = ex.trackBench
      ? (activeSession?.benchReps ?? (prev?.lastReps || 10))
      : (prev?.lastReps ?? 12);
    return {
      progKey,
      prev,
      weightKg: draft?.weightKg ?? fallbackW,
      reps: draft?.reps ?? fallbackR,
    };
  }

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
        ? { label: "Rest", color: "text-[var(--text-secondary)]", border: "border-[var(--border-subtle)] bg-[var(--surface-2)]" }
        : elapsedRestSec < 270
          ? { label: "Ready", color: "text-[#60a5fa]", border: "border-[#3b6cf6]/45 bg-[#3b6cf6]/10" }
          : { label: "Long rest", color: "text-[#fbbf24]", border: "border-[#f59e0b]/45 bg-[#f59e0b]/10" };

  const arenaSpec = ARENAS.find((a) => a.id === arena) ?? ARENAS[0];
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
    const tracked = exercises.filter((e) => e.trackLoad && !swappedExercises[e.id]);
    const hasPartialCheck = doneSets > 0;
    const chosen = hasPartialCheck
      ? tracked.filter((e) => (completedSets[e.id] ?? []).some(Boolean))
      : tracked;

    const loggedExercises = chosen.map((e) => {
      const { progKey, weightKg, reps } = resolveDraft(e);
      return {
        key: progKey,
        weightKg,
        reps,
        isBench: Boolean(e.trackBench),
      };
    });

    const benchEntry = loggedExercises.find((x) => x.isBench);
    const res = completeGateWorkout({
      split: split as SplitId,
      arena: arena as ArenaId,
      gateRank: gateRank as GateRankId,
      setsCompleted: Math.max(doneSets, totalSets),
      benchWeightKg: benchEntry?.weightKg,
      benchReps: benchEntry?.reps,
      loggedExercises,
    });

    const nextSpec = SPLITS.find((s) => s.id === res.nextSplit);
    const nextHint = nextSpec ? `Next: ${nextSpec.label}` : "";

    if (res.isPr && res.newE1rm) {
      playLevelUp();
      addToast({
        title: `NEW BENCH 1RM RECORD: ${res.newE1rm} KG`,
        message: `Vulcan's Anvil struck · +${res.xpAwarded} XP · ${nextHint}`,
        variant: "warning",
      });
    } else if (res.prsHit > 0) {
      playLevelUp();
      addToast({
        title: `${res.prsHit} LIFT PR${res.prsHit > 1 ? "S" : ""} HIT!`,
        message: `${Math.max(doneSets, totalSets)} sets · +${res.xpAwarded} XP · ${nextHint}`,
        variant: "warning",
      });
    } else {
      playQuestComplete();
      addToast({
        title: `${rankSpec.tag} GATE SWEPT`,
        message: `${Math.max(doneSets, totalSets)} sets · +${res.xpAwarded} XP · ${nextHint}`,
        variant: "success",
      });
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Combat HUD"
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface-0)] text-[var(--text-primary)]"
    >
      {/* Clean Top Bar */}
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] truncate">
              {formatSplitHeading(split)}
            </h2>
            {wakeActive && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0"
                title="Screen wake lock active"
              />
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
            {doneSets} of {totalSets} sets · {arena === "cg_gym" ? "CG Gym" : arena === "home_zero" ? "Home" : "Hotel"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {elapsedRestSec !== null && restPhase && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border font-mono text-xs font-medium ${restPhase.border} ${restPhase.color}`}
            >
              <Timer size={12} />
              <span>{formatRestDuration(elapsedRestSec)}</span>
              <span className="text-[11px] font-sans">{restPhase.label}</span>
              <button
                onClick={clearActiveRestTimer}
                className="ml-0.5 opacity-70 hover:opacity-100"
                aria-label="Clear rest timer"
              >
                <X size={11} />
              </button>
            </div>
          )}
          {doneSets > 0 && (
            <button
              onClick={discardActiveSession}
              className="h-9 px-2.5 rounded-full bg-[var(--surface-2)] text-xs font-medium text-[var(--text-secondary)] inline-flex items-center gap-1"
              title="Reset checked sets"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white"
            aria-label="Close workout"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28 max-w-lg w-full mx-auto">
        {split === "cardio_pool" && (
          <p className="text-xs text-[var(--text-muted)] px-1">
            Always lift before CG Pool swim. Keep cardio steady and knees protected.
          </p>
        )}
        {exercises.map((ex) => {
          const isSwapped = Boolean(swappedExercises[ex.id]);
          const activeName = isSwapped ? ex.swap.name : ex.name;
          const activeSets = isSwapped ? ex.swap.sets : ex.sets;
          const activeReps = isSwapped ? ex.swap.reps : ex.reps;
          const activeLoad = isSwapped ? ex.swap.load : ex.load;
          const activeCue = isSwapped ? ex.swap.cue : ex.cue;
          const hasTip = Boolean(activeCue || (!isSwapped && ex.pairHint));
          const tipOpen = Boolean(openTips[ex.id]);
          const savedArr = completedSets[ex.id] ?? [];
          const checks = Array.from({ length: activeSets }, (_, i) => Boolean(savedArr[i]));

          return (
            <div
              key={ex.id}
              className={`rounded-2xl p-4 border ${
                isSwapped
                  ? "bg-[#151226] border-[#8b5cf6]/35"
                  : "bg-[var(--surface-1)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
                    {activeName}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {ex.muscleGroup} · {activeSets} x {activeReps} · {activeLoad}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasTip && (
                    <button
                      onClick={() =>
                        setOpenTips((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
                      }
                      className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                        tipOpen
                          ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                          : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <Info size={12} /> Tip
                    </button>
                  )}
                  <button
                    onClick={() => handleSwap(ex.id, activeName)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                      isSwapped
                        ? "bg-[#8b5cf6]/25 text-[#c4b5fd]"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <RefreshCw size={11} /> {isSwapped ? "Revert" : "Swap"}
                  </button>
                </div>
              </div>

              {tipOpen && hasTip && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--surface-0)] text-xs text-[var(--text-secondary)] space-y-1">
                  {activeCue && <p>{activeCue}</p>}
                  {!isSwapped && ex.pairHint && (
                    <p className="text-[#93c5fd]">{ex.pairHint}</p>
                  )}
                </div>
              )}

              {/* All-Lift Progressive Overload Bar */}
              {ex.trackLoad && !isSwapped && (() => {
                const { progKey, prev, weightKg, reps } = resolveDraft(ex);
                const stepKg = ex.stepKg ?? 2.5;
                const estLift1Rm = epley1Rm(weightKg, reps);
                const isLowTime = gateRank === "low_time_2x";
                const maxCap = isLowTime ? (ex.maxRepsLowTime ?? 19) : (ex.maxRepsRegular ?? 15);
                const readyToBump = Boolean(prev && prev.lastReps >= maxCap);

                return (
                  <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                        {prev
                          ? `Last ${prev.lastWeightKg} kg x ${prev.lastReps}${ex.timeBased ? "s" : ""}`
                          : ex.trackBench
                            ? `Bench e1RM ${estLift1Rm} kg`
                            : `Start ${weightKg} kg x ${reps}${ex.timeBased ? "s" : ""}`}
                      </span>
                      {ex.trackBench && prev && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          e1RM {estLift1Rm} kg
                        </span>
                      )}
                      {readyToBump && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#fbbf24] text-[11px] font-medium">
                          Bump +{stepKg} kg
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                      <button
                        onClick={() =>
                          setActiveDraftLoad(progKey, Math.max(0, weightKg - stepKg), reps)
                        }
                        className="h-9 w-8 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                      >
                        -
                      </button>
                      <span className="min-w-[52px] text-center font-medium text-[var(--text-primary)]">
                        {weightKg} kg
                      </span>
                      <button
                        onClick={() => setActiveDraftLoad(progKey, weightKg + stepKg, reps)}
                        className="h-9 w-8 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                      >
                        +
                      </button>
                      <span className="text-[var(--text-muted)] px-0.5">x</span>
                      <button
                        onClick={() =>
                          setActiveDraftLoad(progKey, weightKg, Math.max(1, reps - 1))
                        }
                        className="h-9 w-8 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                      >
                        -
                      </button>
                      <span className="min-w-[28px] text-center font-medium text-[var(--text-primary)]">
                        {reps}
                        {ex.timeBased ? "s" : ""}
                      </span>
                      <button
                        onClick={() =>
                          setActiveDraftLoad(
                            progKey,
                            weightKg,
                            isLowTime ? Math.min(maxCap, reps + 1) : reps + 1
                          )
                        }
                        className="h-9 w-8 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Tactile Full-Row Set Buttons */}
              <div
                className={`mt-3.5 grid gap-2 ${
                  activeSets === 1
                    ? "grid-cols-1"
                    : activeSets === 2
                      ? "grid-cols-2"
                      : activeSets === 3
                        ? "grid-cols-3"
                        : "grid-cols-4"
                }`}
              >
                {checks.map((done, setIdx) => (
                  <button
                    key={setIdx}
                    onClick={() => handleSetTap(ex.id, setIdx, activeSets)}
                    className={`h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border transition-colors ${
                      done
                        ? "bg-[#22c55e]/20 border-[#22c55e] text-[#4ade80]"
                        : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {done && <Check size={14} />}
                    <span>Set {setIdx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Finish CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[var(--surface-0)]/95 border-t border-[var(--border-subtle)] backdrop-blur-md">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleComplete}
            className="w-full h-12 rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-semibold text-sm text-white transition-colors"
          >
            Finish Workout
          </button>
        </div>
      </div>
    </div>
  );
}
