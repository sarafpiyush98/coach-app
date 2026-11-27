"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Info,
  RefreshCw,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import {
  GATE_RANKS,
  getPrescribedWorkout,
  normalizeGateRankInput,
  SPLITS,
  type ArenaId,
  type GateRankId,
  type SplitId,
} from "@/lib/monarch-catalog";
import { epley1Rm, useMonarchStore, type ActiveSetDraft } from "@/lib/monarch-store";
import { useTodayKey } from "@/lib/use-today-key";
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

function nowEpochMs(): number {
  return Date.now();
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
  if (id === "ul_combo_a") return "U+L A (7-Lift Heavy)";
  if (id === "ul_combo_b") return "U+L B (7-Lift Heavy)";
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
  const setSplit = useMonarchStore((s) => s.setSplit);
  const setArena = useMonarchStore((s) => s.setArena);
  const setGateRank = useMonarchStore((s) => s.setGateRank);
  const toggleExerciseSwap = useMonarchStore((s) => s.toggleExerciseSwap);
  const syncActiveSession = useMonarchStore((s) => s.syncActiveSession);
  const setActiveSetLog = useMonarchStore((s) => s.setActiveSetLog);
  const toggleActiveSet = useMonarchStore((s) => s.toggleActiveSet);
  const clearActiveRestTimer = useMonarchStore((s) => s.clearActiveRestTimer);
  const discardActiveSession = useMonarchStore((s) => s.discardActiveSession);
  const clearSurvivalFloor = useMonarchStore((s) => s.clearSurvivalFloor);
  const completeGateWorkout = useMonarchStore((s) => s.completeGateWorkout);
  const addToast = useToastStore((s) => s.add);

  const todayKey = useTodayKey();
  const normRank = normalizeGateRankInput(gateRank as string);

  const exercises = useMemo(
    () => getPrescribedWorkout(arena, split, normRank),
    [arena, split, normRank]
  );

  const [nowMs, setNowMs] = useState<number>(() => nowEpochMs());
  const [wakeActive, setWakeActive] = useState<boolean>(false);
  const [openTips, setOpenTips] = useState<Record<string, boolean>>({});
  const [zeroFinishPrompt, setZeroFinishPrompt] = useState(false);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);
  const pingedRestAtRef = useRef<number | null>(null);

  const activeSessionHasProgress = Boolean(
    activeSession &&
      activeSession.date === todayKey &&
      Object.values(activeSession.completedSets).some((arr) => arr.some(Boolean))
  );

  const sessionMismatch = Boolean(
    activeSessionHasProgress &&
      activeSession &&
      (activeSession.split !== split ||
        activeSession.arena !== arena ||
        normalizeGateRankInput(activeSession.gateRank as string) !== normRank)
  );

  // Initialize IndexedDB activeSession cleanly (never silently wipe partial another-split progress)
  useEffect(() => {
    if (!open) return;
    if (!activeSession || activeSession.date !== todayKey) {
      syncActiveSession({ reset: true, split, arena, gateRank: normRank });
    } else if (
      !activeSessionHasProgress &&
      (activeSession.split !== split ||
        activeSession.arena !== arena ||
        normalizeGateRankInput(activeSession.gateRank as string) !== normRank)
    ) {
      syncActiveSession({ reset: true, split, arena, gateRank: normRank });
    }
  }, [open, arena, split, normRank, todayKey, activeSession, activeSessionHasProgress, syncActiveSession]);

  // Keep S25 Ultra awake & auto-reacquire when returning from WhatsApp/Spotify
  useEffect(() => {
    if (!open) {
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
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

  // Wall-clock count-up rest stopwatch honoring per-exercise restSec
  const lastSetAtMs = activeSession?.lastSetAtMs ?? null;
  const restTargetSec = activeSession?.activeRestTargetSec ?? 90;
  useEffect(() => {
    if (!open || !lastSetAtMs) return;
    const id = setInterval(() => {
      const now = nowEpochMs();
      setNowMs(now);
      const sec = Math.floor((now - lastSetAtMs) / 1000);
      if (restTargetSec > 0 && sec >= restTargetSec && pingedRestAtRef.current !== lastSetAtMs) {
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
  }, [open, lastSetAtMs, restTargetSec]);

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
  const setLogsMap = activeSession?.setLogs ?? {};
  const draftLoads = activeSession?.draftLoads ?? {};

  function resolveSetList(ex: (typeof exercises)[number]): {
    progKey: string;
    isSwapped: boolean;
    activeTrackLoad: boolean;
    activeBodyweightOnly: boolean;
    stepKg: number;
    setList: ActiveSetDraft[];
    prev: (typeof exerciseLogs)[string] | undefined;
  } {
    const isSwapped = Boolean(swappedExercises[ex.id]);
    const activeTrackLoad = isSwapped
      ? Boolean(ex.swap.trackLoad)
      : Boolean(ex.trackLoad);
    const activeBodyweightOnly = isSwapped
      ? Boolean(ex.swap.bodyweightOnly)
      : Boolean(ex.bodyweightOnly);
    const activeSets = isSwapped ? ex.swap.sets : ex.sets;
    const progKey = isSwapped ? `swap_${ex.id}` : (ex.progressKey ?? ex.id);
    const prev = exerciseLogs?.[progKey];
    const draft = draftLoads[progKey];

    const fallbackWeight = activeBodyweightOnly
      ? 0
      : isSwapped
        ? (prev?.lastWeightKg ?? ex.swap.defaultWeightKg ?? 15)
        : ex.trackBench && !isSwapped
          ? (progKey === "cg_bench_heavy"
              ? (prev?.lastWeightKg ?? activeSession?.benchWeight ?? benchBest.weightKg ?? 57.5)
              : (prev?.lastWeightKg ?? ex.defaultWeightKg ?? 52.5))
          : (prev?.lastWeightKg ?? ex.defaultWeightKg ?? 20);

    const fallbackReps = prev?.lastReps ?? (ex.maxRepsRegular === 8 ? 8 : 12);
    const baseWeight = draft?.weightKg ?? fallbackWeight;
    const baseReps = draft?.reps ?? fallbackReps;
    const savedSetArr = setLogsMap[progKey] ?? [];
    const savedDoneArr = completedSets[ex.id] ?? [];

    const setList: ActiveSetDraft[] = Array.from({ length: activeSets }, (_, i) => ({
      weightKg: savedSetArr[i]?.weightKg ?? baseWeight,
      reps: savedSetArr[i]?.reps ?? baseReps,
      done: Boolean(savedDoneArr[i]),
    }));

    return {
      progKey,
      isSwapped,
      activeTrackLoad,
      activeBodyweightOnly,
      stepKg: isSwapped ? (ex.swap.stepKg ?? 2.5) : (ex.stepKg ?? 2.5),
      setList,
      prev,
    };
  }

  const totalSets = exercises.reduce((acc, ex) => {
    const count = swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
    return acc + count;
  }, 0);

  const doneSets = sessionMismatch
    ? 0
    : exercises.reduce((acc, ex) => {
        const count = swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
        const arr = completedSets[ex.id] ?? [];
        return acc + arr.slice(0, count).filter(Boolean).length;
      }, 0);

  const elapsedRestSec =
    lastSetAtMs !== null ? Math.max(0, Math.floor((nowMs - lastSetAtMs) / 1000)) : null;

  const targetSec = Math.max(45, restTargetSec || 90);
  const restPhase =
    elapsedRestSec === null
      ? null
      : elapsedRestSec < targetSec
        ? {
            label: `Rest (${formatRestDuration(targetSec)})`,
            color: "text-[var(--text-secondary)]",
            border: "border-[var(--border-subtle)] bg-[var(--surface-2)]",
          }
        : elapsedRestSec < targetSec + 90
          ? {
              label: "Ready",
              color: "text-[#60a5fa]",
              border: "border-[#3b6cf6]/45 bg-[#3b6cf6]/10",
            }
          : {
              label: "Long rest",
              color: "text-[#fbbf24]",
              border: "border-[#f59e0b]/45 bg-[#f59e0b]/10",
            };

  const rankSpec = GATE_RANKS.find((g) => g.id === normRank) ?? GATE_RANKS[0];

  function handleSetTap(
    exId: string,
    setIdx: number,
    totalSetsForEx: number,
    restSec: number
  ) {
    setZeroFinishPrompt(false);
    const { turnedOn } = toggleActiveSet({
      split,
      arena,
      gateRank: normRank,
      exId,
      setIdx,
      totalSetsForEx,
      restSec,
    });
    if (turnedOn) {
      setNowMs(nowEpochMs());
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

  function submitWorkout(forceAllComplete = false) {
    const loggedExercises: Array<{
      key: string;
      weightKg: number;
      reps: number;
      isBench?: boolean;
      allSetsAtCap?: boolean;
    }> = [];

    for (const ex of exercises) {
      const { progKey, isSwapped, activeTrackLoad, setList } = resolveSetList(ex);
      if (!activeTrackLoad) continue;

      const completedSetItems = forceAllComplete
        ? setList
        : setList.filter((s) => s.done);
      if (completedSetItems.length === 0) continue;

      const maxCap =
        normRank === "express_2x"
          ? (ex.maxRepsLowTime ?? ((ex.maxRepsRegular ?? 15) <= 12 ? (ex.maxRepsRegular ?? 12) + 2 : 17))
          : (ex.maxRepsRegular ?? 15);

      const allSetsAtCap = completedSetItems.every((s) => s.reps >= maxCap);
      // Best performance set for e1RM tracking
      const bestSet = completedSetItems.reduce((best, cur) => {
        const bestScore = best.weightKg > 0 ? epley1Rm(best.weightKg, best.reps) : best.reps;
        const curScore = cur.weightKg > 0 ? epley1Rm(cur.weightKg, cur.reps) : cur.reps;
        return curScore >= bestScore ? cur : best;
      }, completedSetItems[0]);

      loggedExercises.push({
        key: progKey,
        weightKg: bestSet.weightKg,
        reps: bestSet.reps,
        isBench: Boolean(ex.trackBench && !isSwapped),
        allSetsAtCap,
      });
    }

    const heavyBenchEntry = loggedExercises.find((x) => x.key === "cg_bench_heavy");
    const setsCount = forceAllComplete ? totalSets : doneSets;

    const res = completeGateWorkout({
      split: split as SplitId,
      arena: arena as ArenaId,
      gateRank: normRank as GateRankId,
      setsCompleted: setsCount,
      benchWeightKg: heavyBenchEntry?.weightKg,
      benchReps: heavyBenchEntry?.reps,
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
        message: `${setsCount} sets · +${res.xpAwarded} XP · ${nextHint}`,
        variant: "warning",
      });
    } else {
      playQuestComplete();
      addToast({
        title: `${rankSpec.tag} GATE SWEPT`,
        message: `${setsCount} sets · +${res.xpAwarded} XP · ${nextHint}`,
        variant: "success",
      });
    }
    setZeroFinishPrompt(false);
    onClose();
  }

  function handleFinishClick() {
    if (doneSets === 0) {
      setZeroFinishPrompt(true);
      playSystemPing();
      return;
    }
    submitWorkout(false);
  }

  function handleLog5mFloorFromSheet() {
    const res = clearSurvivalFloor();
    playQuestComplete();
    addToast({
      title: res.alreadyCleared ? "GATE ALREADY GREEN" : "5M SURVIVAL FLOOR CLEARED",
      message: res.alreadyCleared
        ? "No-Skip streak already locked today."
        : `No-Skip chain protected · +${res.xpAwarded} XP`,
      variant: "success",
    });
    setZeroFinishPrompt(false);
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
            {doneSets} of {totalSets} sets · {arena === "cg_gym" ? "CG Gym" : arena === "home_zero" ? "Home" : "Hotel"} · {rankSpec.tag}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {elapsedRestSec !== null && restPhase && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border font-mono text-xs font-medium ${restPhase.border} ${restPhase.color}`}
            >
              <Timer size={12} />
              <span>{formatRestDuration(elapsedRestSec)}</span>
              <span className="text-[11px] font-sans hidden sm:inline">{restPhase.label}</span>
              <button
                onClick={clearActiveRestTimer}
                className="ml-0.5 opacity-70 hover:opacity-100"
                aria-label="Clear rest timer"
              >
                <X size={11} />
              </button>
            </div>
          )}
          {activeSessionHasProgress && (
            <button
              onClick={() => {
                discardActiveSession();
                syncActiveSession({ reset: true, split, arena, gateRank: normRank });
                setZeroFinishPrompt(false);
              }}
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-36 max-w-lg w-full mx-auto">
        {sessionMismatch && activeSession && (
          <div className="p-3.5 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/35 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#fbbf24]">
              <AlertTriangle size={14} />
              <span>
                Active {formatSplitHeading(activeSession.split)} session in progress
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Checking sets here will replace your earlier {formatSplitHeading(activeSession.split)} sets unless you resume it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSplit(activeSession.split);
                  setArena(activeSession.arena);
                  setGateRank(normalizeGateRankInput(activeSession.gateRank as string));
                }}
                className="h-8 px-3 rounded-lg bg-[#3b6cf6] text-white text-xs font-semibold"
              >
                Resume {formatSplitHeading(activeSession.split)}
              </button>
              <button
                onClick={() =>
                  syncActiveSession({ reset: true, split, arena, gateRank: normRank })
                }
                className="h-8 px-3 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-medium"
              >
                Start fresh {formatSplitHeading(split)}
              </button>
            </div>
          </div>
        )}

        {normRank === "low_mana_rir2" && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-xs text-[#c4b5fd]">
            Beru Low-Mana Guard: stop 2-3 reps shy of failure (~85-90% load) to preserve muscle without CNS burnout.
          </div>
        )}

        {split === "cardio_pool" && (
          <p className="text-xs text-[var(--text-muted)] px-1">
            Always lift before CG Pool swim. Keep cardio steady and knees protected.
          </p>
        )}

        {exercises.map((ex, idx) => {
          const {
            progKey,
            isSwapped,
            activeTrackLoad,
            activeBodyweightOnly,
            stepKg,
            setList,
            prev,
          } = resolveSetList(ex);
          const activeName = isSwapped ? ex.swap.name : ex.name;
          const activeSets = isSwapped ? ex.swap.sets : ex.sets;
          const activeReps = isSwapped ? ex.swap.reps : ex.reps;
          const activeLoad = isSwapped ? ex.swap.load : ex.load;
          const activeCue = isSwapped ? ex.swap.cue : ex.cue;
          const hasTip = Boolean(activeCue || (!isSwapped && ex.pairHint));
          const tipOpen = Boolean(openTips[ex.id]);

          const showLowerDivider =
            idx > 0 &&
            ex.blockSection === "lower" &&
            exercises[idx - 1]?.blockSection === "upper";

          const maxCap =
            normRank === "express_2x"
              ? (ex.maxRepsLowTime ?? ((ex.maxRepsRegular ?? 15) <= 12 ? (ex.maxRepsRegular ?? 12) + 2 : 17))
              : (ex.maxRepsRegular ?? 15);
          const readyToBump = Boolean(
            prev &&
              prev.lastReps >= maxCap &&
              prev.allSetsAtCap !== false &&
              !activeBodyweightOnly
          );
          const exceededCapInSession = Boolean(
            !activeBodyweightOnly &&
              !ex.timeBased &&
              setList.some((s) => s.done && s.reps > maxCap)
          );

          return (
            <div key={ex.id} className="space-y-4">
              {showLowerDivider && (
                <div className="px-4 py-2.5 rounded-xl bg-[var(--surface-0)] border border-[#3b6cf6]/30 text-xs text-[#93c5fd] text-center font-medium">
                  Lower Block - take a 5-min water/electrolyte reset before legs
                </div>
              )}
              <div
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
                          setOpenTips((p) => ({ ...p, [ex.id]: !p[ex.id] }))
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

                {/* History & Progression Badges */}
                {activeTrackLoad && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                      {prev
                        ? activeBodyweightOnly
                          ? `Last ${prev.lastReps} reps`
                          : `Last ${prev.lastWeightKg} kg x ${prev.lastReps}${ex.timeBased ? "s" : ""}`
                        : activeBodyweightOnly
                          ? `Target ${activeReps}`
                          : `Start ${setList[0]?.weightKg ?? 20} kg x ${setList[0]?.reps ?? 12}${ex.timeBased ? "s" : ""}`}
                    </span>
                    {ex.trackBench && !isSwapped && setList[0] && (
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        e1RM {epley1Rm(setList[0].weightKg, setList[0].reps)} kg
                      </span>
                    )}
                    {readyToBump && (
                      <span className="px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#fbbf24] text-[11px] font-medium">
                        Bump +{stepKg} kg
                      </span>
                    )}
                    {exceededCapInSession && (
                      <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[11px] font-medium">
                        Too light -&gt; +{stepKg} kg next
                      </span>
                    )}
                  </div>
                )}

                {/* Per-Set Tactile Rows */}
                {activeTrackLoad ? (
                  <div className="mt-3 space-y-2">
                    {setList.map((sItem, setIdx) => (
                      <div
                        key={setIdx}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                          sItem.done
                            ? "bg-[#22c55e]/12 border-[#22c55e]/45"
                            : "bg-[var(--surface-0)] border-[var(--border-subtle)]"
                        }`}
                      >
                        <button
                          onClick={() =>
                            handleSetTap(ex.id, setIdx, activeSets, ex.restSec)
                          }
                          className={`h-9 px-3 rounded-lg font-medium text-xs flex items-center gap-1.5 shrink-0 transition-colors ${
                            sItem.done
                              ? "bg-[#22c55e]/25 text-[#4ade80]"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {sItem.done && <Check size={13} />}
                          <span>Set {setIdx + 1}</span>
                        </button>

                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          {!activeBodyweightOnly ? (
                            <>
                              <button
                                onClick={() =>
                                  setActiveSetLog(
                                    progKey,
                                    setIdx,
                                    activeSets,
                                    Math.max(0, sItem.weightKg - stepKg),
                                    sItem.reps
                                  )
                                }
                                className="h-8 w-7 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                                aria-label={`Decrease weight set ${setIdx + 1}`}
                              >
                                -
                              </button>
                              <span className="min-w-[46px] text-center font-medium text-[var(--text-primary)] tabular-nums">
                                {sItem.weightKg}kg
                              </span>
                              <button
                                onClick={() =>
                                  setActiveSetLog(
                                    progKey,
                                    setIdx,
                                    activeSets,
                                    sItem.weightKg + stepKg,
                                    sItem.reps
                                  )
                                }
                                className="h-8 w-7 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                                aria-label={`Increase weight set ${setIdx + 1}`}
                              >
                                +
                              </button>
                              <span className="text-[var(--text-muted)] px-0.5">x</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-sans text-[var(--text-muted)] mr-1">
                              BW · Reps
                            </span>
                          )}

                          <button
                            onClick={() =>
                              setActiveSetLog(
                                progKey,
                                setIdx,
                                activeSets,
                                sItem.weightKg,
                                Math.max(1, sItem.reps - 1)
                              )
                            }
                            className="h-8 w-7 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                            aria-label={`Decrease reps set ${setIdx + 1}`}
                          >
                            -
                          </button>
                          <span className="min-w-[26px] text-center font-medium text-[var(--text-primary)] tabular-nums">
                            {sItem.reps}
                            {ex.timeBased ? "s" : ""}
                          </span>
                          <button
                            onClick={() =>
                              setActiveSetLog(
                                progKey,
                                setIdx,
                                activeSets,
                                sItem.weightKg,
                                sItem.reps + 1
                              )
                            }
                            className="h-8 w-7 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"
                            aria-label={`Increase reps set ${setIdx + 1}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                    {setList.map((sItem, setIdx) => (
                      <button
                        key={setIdx}
                        onClick={() =>
                          handleSetTap(ex.id, setIdx, activeSets, ex.restSec)
                        }
                        className={`h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border transition-colors ${
                          sItem.done
                            ? "bg-[#22c55e]/20 border-[#22c55e] text-[#4ade80]"
                            : "bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {sItem.done && <Check size={14} />}
                        <span>Set {setIdx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Finish CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[var(--surface-0)]/95 border-t border-[var(--border-subtle)] backdrop-blur-md">
        <div className="max-w-lg mx-auto space-y-2.5">
          {zeroFinishPrompt && (
            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[#f59e0b]/40 space-y-2">
              <p className="text-xs text-[var(--text-primary)] font-medium">
                0 sets checked yet. What did you complete today?
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={handleLog5mFloorFromSheet}
                  className="h-9 rounded-lg bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#4ade80] text-xs font-semibold"
                >
                  5m Floor (+35)
                </button>
                <button
                  onClick={() => submitWorkout(true)}
                  className="h-9 rounded-lg bg-[#3b6cf6] text-white text-xs font-semibold"
                >
                  Complete All {totalSets}
                </button>
                <button
                  onClick={() => setZeroFinishPrompt(false)}
                  className="h-9 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] text-xs font-medium"
                >
                  Keep lifting
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleFinishClick}
            className="w-full h-12 rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-semibold text-sm text-white transition-colors"
          >
            {doneSets > 0
              ? `Finish Workout (${doneSets}/${totalSets} sets)`
              : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
