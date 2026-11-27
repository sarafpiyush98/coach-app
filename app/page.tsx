"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bluetooth,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Scale,
  Timer,
  X,
} from "lucide-react";
import { CombatSheet, formatRestDuration } from "@/components/combat-sheet";
import { FuelSheet, tierBadgeStyle } from "@/components/fuel-sheet";
import { MealPlanSheet } from "@/components/meal-plan-sheet";
import { MuteToggle } from "@/components/mute-toggle";
import { useToastStore } from "@/components/ui/system-toast";
import { canUseWebBluetooth, readBleScaleWeight } from "@/lib/ble-scale";
import {
  ARENAS,
  computeNutritionCoachAdvice,
  CONTEXT_LIST,
  CONTEXTS,
  DEFAULT_WEEKLY_MEAL_PLAN,
  evaluateFoodViability,
  getPrescribedWorkout,
  getPresetsForContext,
  getTodayWeekdayKey,
  SPLITS,
  type ArenaId,
  type ContextId,
  type PlannedMealItem,
  type SplitId,
} from "@/lib/monarch-catalog";
import {
  computeWeeklyTraining,
  createEmptyDay,
  getAmbientShadow,
  getDailyTotals,
  getTodayKey,
  MOVEMENT_PRESETS,
  useMonarchStore,
  type MovementKind,
} from "@/lib/monarch-store";
import {
  playQuestComplete,
  playShadowArise,
  playSystemPing,
} from "@/lib/sounds";

function formatSplitTitle(id: SplitId): string {
  if (id === "upper_a") return "Upper A";
  if (id === "lower_a") return "Lower A";
  if (id === "upper_b") return "Upper B";
  if (id === "lower_b") return "Lower B";
  if (id === "full_body_plus") return "Full Body +";
  return "Jog & Pool";
}

function formatArenaTitle(id: ArenaId): string {
  if (id === "cg_gym") return "CG Gym";
  if (id === "home_zero") return "Home";
  return "Hotel";
}

function SheetModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--surface-1)] border-t sm:border border-[var(--border-subtle)] p-5 pb-8 sm:pb-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:text-white"
            aria-label={`Close ${title}`}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CommandDeckPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const [combatOpen, setCombatOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [fuelSheetOpen, setFuelSheetOpen] = useState(false);
  const [mealPlanOpen, setMealPlanOpen] = useState(false);
  const [stepsSheetOpen, setStepsSheetOpen] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  const [weightEditorOpen, setWeightEditorOpen] = useState(false);
  const [draftWeight, setDraftWeight] = useState(112.4);
  const [draftBf, setDraftBf] = useState("");
  const [draftBw, setDraftBw] = useState("");
  const [bleBusy, setBleBusy] = useState(false);
  const [bleReady, setBleReady] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const handledUrlRef = useRef(false);

  const todayKey = getTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);
  const totals = getDailyTotals(today);
  const weekly = useMemo(() => computeWeeklyTraining(store.days), [store.days]);
  const directive = getAmbientShadow(store);

  const todayWeekday = getTodayWeekdayKey();
  const weeklyPlan = store.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN;
  const todayPlan = weeklyPlan[todayWeekday];
  const dinnerOutMode = Boolean(
    today.dinnerOutMode ?? (todayPlan?.dinnerOut && !today.dinnerSkipped)
  );
  const coachAdvice = useMemo(
    () =>
      computeNutritionCoachAdvice({
        consumedKcal: totals.kcal,
        consumedProteinG: totals.proteinG,
        kcalCeiling: totals.targetKcal,
        proteinTargetG: totals.targetProteinG,
        dinnerSkipped: today.dinnerSkipped,
        dinnerOutMode,
        loggedLabels: today.foods.map((f) => f.label),
        todayPlan,
      }),
    [
      totals.kcal,
      totals.proteinG,
      totals.targetKcal,
      totals.targetProteinG,
      today.dinnerSkipped,
      dinnerOutMode,
      today.foods,
      todayPlan,
    ]
  );

  const activeResume = useMemo(() => {
    const sess = store.activeSession;
    if (!sess || sess.date !== todayKey) return null;
    const exercises = getPrescribedWorkout(sess.arena, sess.split, sess.gateRank);
    const totalSets = exercises.reduce((acc, ex) => {
      const c = store.swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
      return acc + c;
    }, 0);
    const checkedSets = exercises.reduce((acc, ex) => {
      const c = store.swappedExercises[ex.id] ? ex.swap.sets : ex.sets;
      const arr = sess.completedSets[ex.id] ?? [];
      return acc + arr.slice(0, c).filter(Boolean).length;
    }, 0);
    if (checkedSets === 0) return null;
    return {
      split: sess.split,
      arena: sess.arena,
      gateRank: sess.gateRank,
      checkedSets,
      totalSets,
      lastSetAtMs: sess.lastSetAtMs,
    };
  }, [store.activeSession, store.swappedExercises, todayKey]);

  useEffect(() => {
    if (!activeResume?.lastSetAtMs) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeResume?.lastSetAtMs]);

  const prescribedPreview = useMemo(
    () => getPrescribedWorkout(store.arena, store.split, store.gateRank),
    [store.arena, store.split, store.gateRank]
  );

  const contextPresets = useMemo(
    () => getPresetsForContext(store.context),
    [store.context]
  );

  // Sync draft scale inputs & check Web Bluetooth capability
  useEffect(() => {
    setBleReady(canUseWebBluetooth());
    if (store.hasHydrated) {
      setDraftWeight(store.rawWeight);
      setDraftBf(store.bodyFatPct ? String(store.bodyFatPct) : "");
      setDraftBw(store.bodyWaterPct ? String(store.bodyWaterPct) : "");
    }
  }, [store.hasHydrated, store.rawWeight, store.bodyFatPct, store.bodyWaterPct]);

  // Silent 2-way Google Sheet Ledger sync on mount, return from background, and reconnect
  useEffect(() => {
    if (!store.hasHydrated || !store.webhookUrl.trim()) return;
    store.syncWithLedger().catch(() => {});

    const onFocusOrOnline = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        store.syncWithLedger().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onFocusOrOnline);
    window.addEventListener("online", onFocusOrOnline);
    return () => {
      document.removeEventListener("visibilitychange", onFocusOrOnline);
      window.removeEventListener("online", onFocusOrOnline);
    };
  }, [store.hasHydrated, store.webhookUrl]);

  // Execute Android WebAPK shortcuts & Samsung Modes/Routines URL intents once hydrated
  useEffect(() => {
    if (!store.hasHydrated || handledUrlRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const quick = params.get("quick");
    const ctxParam = params.get("context") as ContextId | null;
    const sheet = params.get("sheet");

    if (!quick && !ctxParam && !sheet) return;
    handledUrlRef.current = true;

    if (ctxParam && CONTEXTS[ctxParam]) {
      store.setContext(ctxParam);
    }

    if (quick === "noskip") {
      const res = store.clearSurvivalFloor();
      playQuestComplete();
      addToast({
        title: res.alreadyCleared ? "GATE ALREADY GREEN" : "E-RANK FLOOR CLEARED",
        message: res.alreadyCleared
          ? "No-Skip streak already locked today."
          : `No-Skip protocol complete · +${res.xpAwarded} XP`,
        variant: "success",
      });
    } else if (quick === "salsa-stack") {
      store.setContext("hsr_office");
      store.logFoodPreset("hebe_salsa_chicken", 1);
      playQuestComplete();
      addToast({
        title: "SALSA EGG + CHICKEN LOGGED",
        message: "680 kcal · 65g P · HSR corridor",
        variant: "success",
      });
    } else if (quick === "seal-fast") {
      store.logFoodPreset("whey_skyr_seal", 1);
      store.lockDinnerSkip();
      playShadowArise();
      addToast({
        title: "5 PM SEAL + DINNER SKIPPED",
        message: "+70g P · Early Fasting Seal active",
        variant: "quest",
      });
    } else if (quick === "abs-raid") {
      store.setContext("raid_social");
      store.logFoodPreset("abs_omad_raid", 1);
      playShadowArise();
      addToast({
        title: "GLUTTONY GATE: AB's RAID LOGGED",
        message: "1,550 kcal · 160g P OMAD · Dinner Skip locked",
        variant: "warning",
      });
    }

    if (sheet === "gate") {
      setCombatOpen(true);
    }

    window.history.replaceState({}, "", "/");
  }, [store.hasHydrated]);

  function handleClear5mFloor() {
    const res = store.clearSurvivalFloor();
    if (res.alreadyCleared) {
      playSystemPing();
      addToast({
        title: "GATE ALREADY GREEN TODAY",
        message: "Streak is safe. Open Combat HUD if you want extra sets.",
        variant: "info",
      });
      return;
    }
    playQuestComplete();
    addToast({
      title: "E-RANK SURVIVAL FLOOR CLEARED",
      message: `No-Skip chain protected · +${res.xpAwarded} XP`,
      variant: "success",
    });
  }

  function handleQuickMove(kind: MovementKind) {
    const res = store.logQuickMovement(kind);
    playQuestComplete();
    addToast({
      title: `${MOVEMENT_PRESETS[kind].label.toUpperCase()} LOGGED`,
      message: `+${res.verticalGainM}m Kili ascent · +${res.xpAwarded} XP`,
      variant: "success",
    });
  }

  function handleFoodChip(presetId: string) {
    const res = store.logFoodPreset(presetId, 1);
    if (res.isAbsRaid) {
      playShadowArise();
      addToast({
        title: "AB's LUNCH RAID LOGGED (+75 XP RAID)",
        message: "160g P single-sitting bolus · Dinner Skip auto-sealed!",
        variant: "warning",
      });
    } else {
      playQuestComplete();
      addToast({
        title: res.label.toUpperCase(),
        message: `Logged cleanly · +${res.xpAwarded} XP`,
        variant: "success",
        duration: 2200,
      });
    }
  }

  function handleLogNextPlanned(meal: PlannedMealItem) {
    if (meal.presetId) {
      const res = store.logFoodPreset(meal.presetId, 1, meal.slot);
      if (res.label !== "Unknown") {
        if (res.isAbsRaid) playShadowArise();
        else playQuestComplete();
        addToast({
          title: `${meal.label.toUpperCase()} LOGGED`,
          message: `${meal.proteinG}g P · ${meal.kcal} kcal · +${res.xpAwarded} XP`,
          variant: "success",
          duration: 2200,
        });
        return;
      }
    }
    const res = store.logCustomFood(meal.label, meal.kcal, meal.proteinG, meal.slot);
    playQuestComplete();
    addToast({
      title: `${meal.label.toUpperCase()} LOGGED`,
      message: `${meal.proteinG}g P · ${meal.kcal} kcal · +${res.xpAwarded} XP`,
      variant: "success",
      duration: 2200,
    });
  }

  function handleToggleDinnerOut() {
    const next = !dinnerOutMode;
    store.setTodayDinnerOutMode(next);
    playSystemPing();
    addToast({
      title: next ? "DINNER OUT MODE ACTIVE" : "SKIP DINNER DEFAULT RESTORED",
      message: next
        ? "Coach recalculated evening protein & calorie budget."
        : "Lock Skip Dinner after 5 PM Seal to earn +30 XP.",
      variant: "info",
      duration: 2200,
    });
  }

  function handleLockDinnerSkip() {
    const res = store.lockDinnerSkip();
    if (res.alreadyLocked) return;
    playShadowArise();
    addToast({
      title: "EARLY FASTING SEAL LOCKED",
      message: `Dinner skipped cleanly · +${res.xpAwarded} XP · Swiggy intercepted`,
      variant: "quest",
    });
  }

  function handleSaveWeight() {
    const bfNum = draftBf.trim() ? Number(draftBf) : null;
    const bwNum = draftBw.trim() ? Number(draftBw) : null;
    const res = store.logScaleWeight(draftWeight, bfNum, bwNum);
    playSystemPing();
    setWeightEditorOpen(false);
    addToast({
      title: `EMA UPDATED: ${res.ema} KG`,
      message: `Raw ${res.raw} kg${bfNum ? ` · ${bfNum}% BF` : ""} smoothed via 7d EMA`,
      variant: "info",
    });
  }

  async function handleBleScan() {
    if (bleBusy) return;
    setBleBusy(true);
    try {
      const reading = await readBleScaleWeight();
      setDraftWeight(reading.weightKg);
      const bfNum = draftBf.trim() ? Number(draftBf) : null;
      const bwNum = draftBw.trim() ? Number(draftBw) : null;
      const res = store.logScaleWeight(reading.weightKg, bfNum, bwNum);
      playQuestComplete();
      setWeightEditorOpen(false);
      addToast({
        title: `BLE SCALE: ${reading.weightKg} KG`,
        message: `${reading.deviceName || "Smart Scale"} -> EMA ${res.ema} kg`,
        variant: "success",
      });
    } catch (err) {
      addToast({
        title: "BLE SCALE READ CANCELLED",
        message: err instanceof Error ? err.message : "Could not read Bluetooth scale.",
        variant: "warning",
      });
    } finally {
      setBleBusy(false);
    }
  }

  function handleSetSamsungSteps(steps: number, allowLower = false) {
    const res = store.setSamsungSteps(steps, allowLower);
    playQuestComplete();
    addToast({
      title: `SAMSUNG STEPS: ${steps.toLocaleString()}`,
      message:
        res.xpAwarded > 0
          ? `Milestone cleared · +${res.verticalGainM}m Kili · +${res.xpAwarded} XP`
          : allowLower && steps === 0
          ? "Manual test steps cleared to 0."
          : "Step count synced cleanly.",
      variant: "success",
    });
  }

  function handleDirectiveAction() {
    if (!directive?.actionKind) return;
    if (directive.actionKind === "seal_whey") {
      handleFoodChip("whey_skyr_seal");
    } else if (directive.actionKind === "lock_skip") {
      handleLockDinnerSkip();
    } else if (directive.actionKind === "floor_5m") {
      handleClear5mFloor();
    } else if (directive.actionKind === "debloat_food") {
      handleFoodChip("hotel_debloat");
    }
  }

  const activeSplitSpec =
    SPLITS.find((s) => s.id === store.split) ?? SPLITS[0];
  const coreSplits = SPLITS.filter((s) => s.tier === "core");
  const bonusSplits = SPLITS.filter((s) => s.tier === "bonus");
  const workoutDoneToday =
    today.survivalFloorCleared ||
    today.workouts.length > 0 ||
    today.movements.length > 0 ||
    (today.samsungSteps ?? 0) >= 8000;
  const samsungSteps = today.samsungSteps ?? 0;
  const stepPct = Math.min(100, Math.round((samsungSteps / Math.max(store.stepTarget, 1)) * 100));
  const proteinPct = Math.min(100, Math.round((totals.proteinG / totals.targetProteinG) * 100));
  const kcalPct = Math.min(100, Math.round((totals.kcal / totals.targetKcal) * 100));
  const overKcal = totals.kcal > totals.targetKcal + 150;
  const splitTitle = formatSplitTitle(store.split);
  const actionableDirective =
    directive && directive.soldier !== "Igris" ? directive : null;

  const quickThreePresets = useMemo(() => {
    const others = contextPresets.filter((p) => p.id !== "whey_skyr_seal");
    const seal = contextPresets.find((p) => p.id === "whey_skyr_seal");
    return [...others.slice(0, 2), ...(seal ? [seal] : [])].slice(0, 3);
  }, [contextPresets]);

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-5">
      {/* 1. MINIMAL TOP BAR */}
      <header className="h-11 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Monarch
          </h1>
          <button
            onClick={() => setContextSheetOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="truncate">{CONTEXTS[store.context].shortLabel}</span>
            <ChevronDown size={13} />
          </button>
        </div>

        <button
          onClick={() => setWeightEditorOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] font-mono tabular-nums text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors shrink-0"
        >
          <Scale size={13} className="text-[var(--text-secondary)]" />
          <span>{store.weightEma} kg</span>
        </button>
      </header>

      {/* 2. TODAY'S VITALS STRIP */}
      <section className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => setStepsSheetOpen(true)}
          className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-3.5 text-left hover:border-[var(--border-accent)] transition-colors"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Steps</span>
            {today.hcStepsLive && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"
                title="Live Health Connect telemetry"
              />
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1 truncate">
            <span className="font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {samsungSteps.toLocaleString()}
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              / {Math.round(store.stepTarget / 1000)}k
            </span>
          </div>
          <div className="mt-2.5 h-1 rounded-full bg-[var(--surface-0)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                samsungSteps >= 10000 ? "progress-green" : "progress-blue"
              }`}
              style={{ width: `${stepPct}%` }}
            />
          </div>
        </button>

        <button
          onClick={() => setFuelSheetOpen(true)}
          className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-3.5 text-left hover:border-[var(--border-accent)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text-secondary)]">Protein</span>
          <div className="mt-1.5 flex items-baseline gap-1 truncate">
            <span className="font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {totals.proteinG}g
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              / {totals.targetProteinG}g
            </span>
          </div>
          <div className="mt-2.5 h-1 rounded-full bg-[var(--surface-0)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totals.proteinG >= 145 ? "progress-green" : "progress-blue"
              }`}
              style={{ width: `${proteinPct}%` }}
            />
          </div>
        </button>

        <button
          onClick={() => setFuelSheetOpen(true)}
          className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-3.5 text-left hover:border-[var(--border-accent)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text-secondary)]">Calories</span>
          <div className="mt-1.5 flex items-baseline gap-1 truncate">
            <span className="font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
              {totals.kcal}
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              / {totals.targetKcal}
            </span>
          </div>
          <div className="mt-2.5 h-1 rounded-full bg-[var(--surface-0)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                overKcal ? "progress-red" : "progress-blue"
              }`}
              style={{ width: `${kcalPct}%` }}
            />
          </div>
        </button>
      </section>

      {/* OPTIONAL SINGLE-LINE ACTIONABLE BANNER */}
      {store.coachBanner.trim() ? (
        <div className="rounded-2xl px-4 py-3 bg-[var(--surface-1)] border border-[#f59e0b]/35 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-primary)] leading-snug">
            <span className="font-semibold text-[#fbbf24] mr-1.5">Note:</span>
            {store.coachBanner}
          </p>
        </div>
      ) : activeResume ? (
        <button
          onClick={() => {
            store.setSplit(activeResume.split);
            store.setArena(activeResume.arena);
            store.setGateRank(activeResume.gateRank);
            setCombatOpen(true);
          }}
          className="w-full rounded-2xl px-4 py-3 bg-[var(--surface-1)] border border-[#3b6cf6]/40 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Timer size={15} className="text-[#60a5fa] shrink-0" />
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
              {formatSplitTitle(activeResume.split)} in progress ({activeResume.checkedSets}/
              {activeResume.totalSets} sets)
              {activeResume.lastSetAtMs
                ? ` · Resting ${formatRestDuration(
                    Math.max(0, Math.floor((nowMs - activeResume.lastSetAtMs) / 1000))
                  )}`
                : ""}
            </span>
          </div>
          <span className="text-xs font-semibold text-[#60a5fa] shrink-0">Resume</span>
        </button>
      ) : actionableDirective ? (
        <div className="rounded-2xl px-4 py-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-secondary)] leading-snug">
            {actionableDirective.message}
          </p>
          {actionableDirective.actionLabel && (
            <button
              onClick={handleDirectiveAction}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
            >
              {actionableDirective.actionKind === "seal_whey"
                ? "Add Whey+Skyr"
                : actionableDirective.actionKind === "lock_skip"
                  ? "Skip dinner"
                  : actionableDirective.actionKind === "floor_5m"
                    ? "5m Floor"
                    : "De-bloat meal"}
            </button>
          )}
        </div>
      ) : null}

      {/* 3. TODAY'S WORKOUT CARD */}
      <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              This week · {weekly.coreDoneCount}/4
            </span>
            <div className="flex items-center gap-1.5" aria-label="Weekly core workout progress">
              {coreSplits.map((sp) => {
                const done = (weekly.completedThisWeek[sp.id] ?? 0) > 0;
                const isNext = sp.id === weekly.nextCoreSplit;
                return (
                  <span
                    key={sp.id}
                    title={formatSplitTitle(sp.id)}
                    className={`w-2 h-2 rounded-full ${
                      done
                        ? "bg-[#22c55e]"
                        : isNext
                          ? "bg-[#3b6cf6]/40 ring-1 ring-[#3b6cf6]"
                          : "bg-[var(--surface-3)]"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setSwitchOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#60a5fa] hover:text-[#93c5fd]"
          >
            <span>Change</span>
            {switchOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {splitTitle}
          </h2>
          {workoutDoneToday && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[11px] font-medium">
              <Check size={11} /> Done
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-[var(--text-secondary)] truncate">
          {activeSplitSpec.focus} · {formatArenaTitle(store.arena)} · {prescribedPreview.length} exercises
        </p>

        {/* iOS Segmented Mode Pill */}
        <div className="mt-4 bg-[var(--surface-0)] p-1 rounded-xl grid grid-cols-2 gap-1">
          {(["regular_3x15", "low_time_2x"] as const).map((rankId) => {
            const active = store.gateRank === rankId;
            return (
              <button
                key={rankId}
                onClick={() => store.setGateRank(rankId)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {rankId === "regular_3x15" ? "Regular · 3x15" : "Low Time · 2x Fail"}
              </button>
            );
          })}
        </div>

        {/* Collapsible Change Drawer */}
        {switchOpen && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] mb-2">
                Core weekly rotation
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {coreSplits.map((sp) => {
                  const doneCount = weekly.completedThisWeek[sp.id] ?? 0;
                  const isNext = sp.id === weekly.nextCoreSplit;
                  const isSelected = store.split === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => store.setSplit(sp.id)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-medium border flex flex-col items-center gap-0.5 transition-colors ${
                        isSelected
                          ? "bg-[var(--surface-2)] border-[#3b6cf6] text-[var(--text-primary)]"
                          : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {doneCount > 0 && <Check size={11} className="text-[#4ade80]" />}
                        {formatSplitTitle(sp.id)}
                      </span>
                      {isNext && (
                        <span className="text-[10px] text-[#60a5fa]">Next</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] mb-2">
                Optional 5th-6th day
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {bonusSplits.map((sp) => {
                  const doneCount = weekly.completedThisWeek[sp.id] ?? 0;
                  const isSelected = store.split === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => store.setSplit(sp.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        isSelected
                          ? "bg-[var(--surface-2)] border-[#3b6cf6] text-[var(--text-primary)]"
                          : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {doneCount > 0 && <Check size={11} className="text-[#4ade80]" />}
                      <span>{sp.id === "full_body_plus" ? "Day 5 · Full Body +" : "Day 6 · Jog & Pool"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] mb-2">
                Location
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {ARENAS.map((ar) => (
                  <button
                    key={ar.id}
                    onClick={() => store.setArena(ar.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                      store.arena === ar.id
                        ? "bg-[var(--surface-2)] border-[#3b6cf6] text-[var(--text-primary)]"
                        : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {formatArenaTitle(ar.id)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleClear5mFloor}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] pt-1"
            >
              Need an emergency check-in? Log 5m No-Skip Floor
            </button>
          </div>
        )}

        <button
          onClick={() => setCombatOpen(true)}
          className="mt-4 h-12 w-full rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-semibold text-sm text-white transition-colors"
        >
          {activeResume
            ? `Resume ${splitTitle} (${activeResume.checkedSets}/${activeResume.totalSets})`
            : `Start ${splitTitle}`}
        </button>
      </section>

      {/* 4. FUEL CARD */}
      <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Fuel</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleDinnerOut}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                dinnerOutMode
                  ? "bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/35"
                  : today.dinnerSkipped
                    ? "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              title="Switch today between Skip Dinner & Dinner Out budget"
            >
              {dinnerOutMode
                ? "Dinner out"
                : today.dinnerSkipped
                  ? "Dinner skipped ✓"
                  : "Skip dinner"}
            </button>
            <button
              onClick={() => setMealPlanOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
            >
              <Calendar size={11} />
              <span>Week plan</span>
            </button>
          </div>
        </div>

        {/* Coach Nutrition Advice */}
        <div
          className={`rounded-xl p-3 border flex items-center justify-between gap-3 ${
            coachAdvice.tone === "amber"
              ? "bg-[#f59e0b]/10 border-[#f59e0b]/30"
              : coachAdvice.tone === "emerald"
                ? "bg-[#22c55e]/10 border-[#22c55e]/30"
                : coachAdvice.tone === "violet"
                  ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
                  : "bg-[var(--surface-0)] border-[var(--border-subtle)]"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {coachAdvice.headline}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              {coachAdvice.actionTip}
            </p>
          </div>
          {coachAdvice.nextPlannedMeal && (
            <button
              onClick={() => handleLogNextPlanned(coachAdvice.nextPlannedMeal!)}
              className="shrink-0 h-8 px-2.5 rounded-lg bg-[#3b6cf6] hover:bg-[#2f5ee5] text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
              title={`Log planned: ${coachAdvice.nextPlannedMeal.label}`}
            >
              <Plus size={12} />
              <span>Next meal</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setFuelSheetOpen(true)}
            className="h-11 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-sm font-medium text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={15} />
            <span>Log / build plate</span>
          </button>

          <button
            onClick={handleLockDinnerSkip}
            disabled={today.dinnerSkipped && !dinnerOutMode}
            className={`h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
              today.dinnerSkipped && !dinnerOutMode
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
                : "bg-[var(--surface-0)] hover:bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {today.dinnerSkipped && !dinnerOutMode ? (
              <>
                <Check size={15} />
                <span>Dinner skipped</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>Lock skip dinner</span>
              </>
            )}
          </button>
        </div>

        {/* Top 3 Quick-Log Pills */}
        <div className="flex flex-wrap gap-2">
          {quickThreePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleFoodChip(preset.id)}
              className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>

        {/* Clean Single-Column Logged Meals */}
        {today.foods.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            {today.foods.map((entry) => {
              const v = evaluateFoodViability(entry.kcal, entry.proteinG);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-mono font-semibold shrink-0 ${tierBadgeStyle(
                        v.tier
                      )}`}
                    >
                      {v.tier}
                    </span>
                    <span className="text-[var(--text-primary)] truncate">{entry.label}</span>
                    {entry.slot && (
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        · {entry.slot === "seal" ? "5 PM Seal" : entry.slot}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                      {entry.proteinG}g P · {entry.kcal} kcal
                    </span>
                    <button
                      onClick={() => store.removeFoodEntry(todayKey, entry.id)}
                      className="text-[var(--text-muted)] hover:text-[#ef4444]"
                      aria-label={`Remove ${entry.label}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODULAR BOTTOM SHEETS: PLATE BUILDER & WEEKLY MEAL PLAN */}
      <FuelSheet
        open={fuelSheetOpen}
        onClose={() => setFuelSheetOpen(false)}
      />
      <MealPlanSheet
        open={mealPlanOpen}
        onClose={() => setMealPlanOpen(false)}
      />

      {/* BOTTOM SHEET: SCALE & BODY COMP */}
      <SheetModal
        open={weightEditorOpen}
        onClose={() => setWeightEditorOpen(false)}
        title="Weight & body comp"
      >
        <div className="p-3.5 rounded-xl bg-[var(--surface-0)] flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Raw weigh-in (kg)</p>
            <p className="text-[11px] text-[var(--text-muted)]">7d EMA: {store.weightEma} kg</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm">
            <button
              onClick={() => setDraftWeight((w) => Math.round((w - 0.2) * 10) / 10)}
              className="h-9 px-3 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)]"
            >
              -0.2
            </button>
            <span className="min-w-[54px] text-center font-semibold">
              {draftWeight.toFixed(1)}
            </span>
            <button
              onClick={() => setDraftWeight((w) => Math.round((w + 0.2) * 10) / 10)}
              className="h-9 px-3 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)]"
            >
              +0.2
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            step="0.1"
            placeholder="OKOK BF %"
            value={draftBf}
            onChange={(e) => setDraftBf(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Water %"
            value={draftBw}
            onChange={(e) => setDraftBw(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] font-mono text-xs"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveWeight}
            className="flex-1 h-11 rounded-xl bg-[#3b6cf6] text-white text-sm font-semibold"
          >
            Save weight
          </button>
          {bleReady && (
            <button
              onClick={handleBleScan}
              disabled={bleBusy}
              className="h-11 px-4 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Bluetooth size={14} className="text-[#4ade80]" />
              <span>{bleBusy ? "Scanning..." : "Scan BLE Scale"}</span>
            </button>
          )}
        </div>
      </SheetModal>

      {/* BOTTOM SHEET: MOVEMENT & STEPS */}
      <SheetModal
        open={stepsSheetOpen}
        onClose={() => setStepsSheetOpen(false)}
        title="Steps & activity"
      >
        <div className="p-3.5 rounded-xl bg-[var(--surface-0)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              {today.hcStepsLive ? "Samsung Health (Live)" : "Daily steps"}
            </p>
            <p className="font-mono tabular-nums text-lg font-semibold text-[var(--text-primary)] mt-0.5">
              {samsungSteps.toLocaleString()} / {store.stepTarget.toLocaleString()}
            </p>
          </div>
          {today.hcStepsLive && (
            <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-xs font-medium">
              Live
            </span>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            Log activity (+Kilimanjaro vertical)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MOVEMENT_PRESETS) as MovementKind[]).map((kind) => {
              const mp = MOVEMENT_PRESETS[kind];
              return (
                <button
                  key={kind}
                  onClick={() => {
                    handleQuickMove(kind);
                    setStepsSheetOpen(false);
                  }}
                  className="p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-left transition-colors"
                >
                  <p className="text-xs font-medium text-[var(--text-primary)]">{mp.label}</p>
                  <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">
                    +{mp.verticalGainM}m · +{mp.xp} XP
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {!today.hcStepsLive && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)] mb-2">Manual step override</p>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {samsungSteps > 0 ? (
                <button
                  onClick={() => handleSetSamsungSteps(0, true)}
                  className="py-2 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                >
                  Reset 0
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => handleSetSamsungSteps(samsungSteps + 2500)}
                className="py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)]"
              >
                +2.5k
              </button>
              <button
                onClick={() => handleSetSamsungSteps(Math.max(samsungSteps, 10000))}
                className="py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)]"
              >
                10k
              </button>
              <button
                onClick={() => handleSetSamsungSteps(Math.max(samsungSteps, 15000))}
                className="py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)]"
              >
                15k
              </button>
            </div>
          </div>
        )}
      </SheetModal>

      {/* BOTTOM SHEET: CONTEXT & MODES */}
      <SheetModal
        open={contextSheetOpen}
        onClose={() => setContextSheetOpen(false)}
        title="Context & modes"
      >
        <div className="grid grid-cols-2 gap-2">
          {CONTEXT_LIST.map((ctx) => {
            const active = store.context === ctx.id;
            return (
              <button
                key={ctx.id}
                onClick={() => store.setContext(ctx.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  active
                    ? "bg-[var(--surface-2)] border-[#3b6cf6] text-[var(--text-primary)]"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <p className="text-xs font-semibold">{ctx.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{ctx.sub}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={store.toggleLowMana}
            className="w-full p-3 rounded-xl bg-[var(--surface-0)] flex items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Low mana mode</p>
              <p className="text-[11px] text-[var(--text-muted)]">Short sleep -&gt; switches to 2x Fail</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                store.lowMana
                  ? "bg-[#3b6cf6]/20 text-[#93c5fd]"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              }`}
            >
              {store.lowMana ? "On" : "Off"}
            </span>
          </button>

          <button
            onClick={store.toggleDebloat}
            className="w-full p-3 rounded-xl bg-[var(--surface-0)] flex items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">36h de-bloat mode</p>
              <p className="text-[11px] text-[var(--text-muted)]">Highlights hydration & lean food guard</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                store.debloatMode
                  ? "bg-[#f59e0b]/20 text-[#fbbf24]"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              }`}
            >
              {store.debloatMode ? "On" : "Off"}
            </span>
          </button>

          <div className="w-full p-3 rounded-xl bg-[var(--surface-0)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Sound cues</p>
              <p className="text-[11px] text-[var(--text-muted)]">Set timer chime & completion tones</p>
            </div>
            <MuteToggle />
          </div>
        </div>
      </SheetModal>

      {/* Live Workout Combat Sheet */}
      <CombatSheet open={combatOpen} onClose={() => setCombatOpen(false)} />
    </div>
  );
}
