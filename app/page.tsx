"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Bluetooth,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  Lock,
  Moon,
  Pill,
  Plus,
  Scale,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { CombatSheet, formatRestDuration } from "@/components/combat-sheet";
import { FuelSheet, tierBadgeStyle } from "@/components/fuel-sheet";
import { MealPlanSheet } from "@/components/meal-plan-sheet";
import { MuteToggle } from "@/components/mute-toggle";
import { ReadingSheet } from "@/components/reading-sheet";
import { WeightTrendChart } from "@/components/weight-trend-chart";
import { useToastStore } from "@/components/ui/system-toast";
import { canUseWebBluetooth, readBleScaleWeight } from "@/lib/ble-scale";
import {
  ARENAS,
  computeNutritionCoachAdvice,
  CONTEXT_LIST,
  CONTEXTS,
  DEFAULT_WEEKLY_MEAL_PLAN,
  evaluateFoodViability,
  FOOD_PRESETS,
  getPrescribedWorkout,
  getPresetsForContext,
  getTodayWeekdayKey,
  normalizeGateRankInput,
  SPLITS,
  type ArenaId,
  type ContextId,
  type GateRankId,
  type PlannedMealItem,
  type SplitId,
} from "@/lib/monarch-catalog";
import {
  computeDeloadAdvisory,
  computeReadingStreak,
  computeWeeklyAvgKcal,
  computeWeeklyTraining,
  createEmptyDay,
  getAmbientShadow,
  getDailyReadingPages,
  getDailyTotals,
  levelFromMonarchXp,
  MOVEMENT_PRESETS,
  useMonarchStore,
  type MovementKind,
} from "@/lib/monarch-store";
import { useTodayKey } from "@/lib/use-today-key";
import { DEFAULT_EMA_ALPHA, recomputeWeightTrend } from "@/lib/weight-engine";
import {
  playQuestComplete,
  playShadowArise,
  playSystemPing,
} from "@/lib/sounds";

function nowEpochMs(): number {
  return Date.now();
}

function formatSplitTitle(id: SplitId): string {
  if (id === "upper_a") return "Upper A";
  if (id === "lower_a") return "Lower A";
  if (id === "upper_b") return "Upper B";
  if (id === "lower_b") return "Lower B";
  if (id === "ul_combo_a") return "U+L A (Heavy)";
  if (id === "ul_combo_b") return "U+L B (Heavy)";
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

const noopSubscribe = () => () => {};

export default function CommandDeckPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const hasHydrated = useMonarchStore((s) => s.hasHydrated);
  const webhookUrl = useMonarchStore((s) => s.webhookUrl);
  const syncWithLedger = useMonarchStore((s) => s.syncWithLedger);
  const maybeAutoDetectContext = useMonarchStore((s) => s.maybeAutoDetectContext);
  const setContext = useMonarchStore((s) => s.setContext);
  const clearSurvivalFloor = useMonarchStore((s) => s.clearSurvivalFloor);
  const logFoodPreset = useMonarchStore((s) => s.logFoodPreset);
  const lockDinnerSkip = useMonarchStore((s) => s.lockDinnerSkip);

  const [combatOpen, setCombatOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [fuelSheetOpen, setFuelSheetOpen] = useState(false);
  const [mealPlanOpen, setMealPlanOpen] = useState(false);
  const [readingSheetOpen, setReadingSheetOpen] = useState(false);
  const [readingSheetMode, setReadingSheetMode] = useState<"update" | "add">("update");
  const [stepsSheetOpen, setStepsSheetOpen] = useState(false);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);
  const [weightEditorOpen, setWeightEditorOpen] = useState(false);
  const [draftWeight, setDraftWeight] = useState(112.4);
  const [draftBf, setDraftBf] = useState("");
  const [draftBw, setDraftBw] = useState("");
  const [bleBusy, setBleBusy] = useState(false);
  const [blePendingConfirmKg, setBlePendingConfirmKg] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => nowEpochMs());
  const handledUrlRef = useRef(false);

  const bleReady = useSyncExternalStore(
    noopSubscribe,
    canUseWebBluetooth,
    () => false
  );

  const todayKey = useTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);
  const totals = getDailyTotals(today, store.kcalTarget, store.proteinTargetG);
  const weekly = useMemo(() => computeWeeklyTraining(store.days), [store.days]);
  const weeklyAvgKcal = useMemo(() => computeWeeklyAvgKcal(store.days), [store.days]);
  const deload = useMemo(
    () => computeDeloadAdvisory(store.days, store.lastDeloadDate),
    [store.days, store.lastDeloadDate]
  );
  const weightTrend = useMemo(
    () =>
      recomputeWeightTrend(
        store.days,
        112.4,
        store.rawWeight,
        DEFAULT_EMA_ALPHA,
        todayKey
      ),
    [store.days, store.rawWeight, todayKey]
  );
  const directive = getAmbientShadow(store);
  const lvl = useMemo(
    () => levelFromMonarchXp(store.legacyXp + store.earnedXp),
    [store.legacyXp, store.earnedXp]
  );

  const books = store.books ?? [];
  const activeBook =
    books.find((b) => b.id === store.activeBookId) ??
    books.find((b) => b.status === "reading") ??
    books[0] ??
    null;
  const todayPages = getDailyReadingPages(today);
  const readingMin = store.readingMinPages || 5;
  const readingDone = todayPages >= readingMin;
  const readingStreak = useMemo(
    () => computeReadingStreak(store.days, readingMin),
    [store.days, readingMin]
  );

  const todayWeekday = getTodayWeekdayKey();
  const weeklyPlan = store.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN;
  const todayPlan = weeklyPlan[todayWeekday];
  const dinnerOutMode = Boolean(
    today.dinnerOutMode ?? (todayPlan?.dinnerOut && !today.dinnerSkipped)
  );

  const trainedFastedBeforeNoon = useMemo(
    () =>
      today.workouts.some((w) => new Date(w.timeIso).getHours() < 12) &&
      totals.proteinG === 0,
    [today.workouts, totals.proteinG]
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
        loggedFoods: today.foods,
        todayPlan,
        weeklyAvgKcal,
        trainedFastedBeforeNoon,
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
      weeklyAvgKcal,
      trainedFastedBeforeNoon,
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
      gateRank: normalizeGateRankInput(sess.gateRank as string),
      checkedSets,
      totalSets,
      lastSetAtMs: sess.lastSetAtMs,
    };
  }, [store.activeSession, store.swappedExercises, todayKey]);

  useEffect(() => {
    if (!activeResume?.lastSetAtMs) return;
    const id = setInterval(() => setNowMs(nowEpochMs()), 1000);
    return () => clearInterval(id);
  }, [activeResume?.lastSetAtMs]);

  const normGateRank = normalizeGateRankInput(store.gateRank as string);
  const prescribedPreview = useMemo(
    () => getPrescribedWorkout(store.arena, store.split, normGateRank),
    [store.arena, store.split, normGateRank]
  );

  const contextPresets = useMemo(
    () => getPresetsForContext(store.context),
    [store.context]
  );

  // Auto-detect context once per day on hydration
  useEffect(() => {
    if (!hasHydrated) return;
    maybeAutoDetectContext();
  }, [hasHydrated, maybeAutoDetectContext]);

  // Silent 2-way Google Sheet Ledger sync on mount, return from background, and reconnect
  useEffect(() => {
    if (!hasHydrated || !webhookUrl.trim()) return;
    syncWithLedger().catch(() => {});

    const onFocusOrOnline = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        syncWithLedger().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onFocusOrOnline);
    window.addEventListener("online", onFocusOrOnline);
    return () => {
      document.removeEventListener("visibilitychange", onFocusOrOnline);
      window.removeEventListener("online", onFocusOrOnline);
    };
  }, [hasHydrated, webhookUrl, syncWithLedger]);

  // Execute Android WebAPK shortcuts & Samsung Modes/Routines URL intents once hydrated
  useEffect(() => {
    if (!hasHydrated || handledUrlRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const quick = params.get("quick");
    const ctxParam = params.get("context") as ContextId | null;
    const sheet = params.get("sheet");

    if (!quick && !ctxParam && !sheet) return;
    handledUrlRef.current = true;

    if (ctxParam && CONTEXTS[ctxParam]) {
      setContext(ctxParam);
    }

    if (quick === "noskip") {
      const res = clearSurvivalFloor();
      playQuestComplete();
      addToast({
        title: res.alreadyCleared ? "GATE ALREADY GREEN" : "E-RANK FLOOR CLEARED",
        message: res.alreadyCleared
          ? "No-Skip streak already locked today."
          : `No-Skip protocol complete · +${res.xpAwarded} XP`,
        variant: "success",
      });
    } else if (quick === "salsa-stack") {
      setContext("hsr_office");
      logFoodPreset("hebe_salsa_chicken", 1);
      playQuestComplete();
      addToast({
        title: "SALSA EGG + CHICKEN LOGGED",
        message: "680 kcal · 65g P · HSR corridor",
        variant: "success",
      });
    } else if (quick === "seal-fast") {
      logFoodPreset("whey_skyr_seal", 1);
      lockDinnerSkip();
      playShadowArise();
      addToast({
        title: "5 PM SEAL + OMAD CLOSED",
        message: "+70g P · Early Fasting Seal active",
        variant: "quest",
      });
    } else if (quick === "abs-raid") {
      setContext("raid_social");
      logFoodPreset("abs_omad_raid", 1);
      playShadowArise();
      addToast({
        title: "GLUTTONY GATE: AB's RAID LOGGED",
        message: "1,550 kcal · 160g P OMAD · Window locked",
        variant: "warning",
      });
    }

    if (sheet === "gate") {
      setCombatOpen(true);
    }

    window.history.replaceState({}, "", "/");
  }, [
    hasHydrated,
    setContext,
    clearSurvivalFloor,
    logFoodPreset,
    lockDinnerSkip,
    addToast,
  ]);

  function openWeightEditor() {
    setDraftWeight(store.rawWeight);
    setDraftBf(store.bodyFatPct ? String(store.bodyFatPct) : "");
    setDraftBw(store.bodyWaterPct ? String(store.bodyWaterPct) : "");
    setBlePendingConfirmKg(null);
    setWeightEditorOpen(true);
  }

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

  function handleToggleRestDay() {
    const res = store.toggleRestDay();
    playSystemPing();
    addToast({
      title: res.isRest ? "REST DAY LOGGED" : "REST DAY CLEARED",
      message: res.isRest
        ? "Intentional recovery day logged (max 2 consecutive rest days)."
        : "Rest day toggle cleared.",
      variant: "info",
      duration: 2200,
    });
  }

  function handleSelectContext(ctxId: ContextId) {
    const targetArena =
      ctxId === "travel"
        ? "Hotel"
        : store.arena === "nomad_hotel"
          ? formatArenaTitle(CONTEXTS[ctxId].defaultArena)
          : formatArenaTitle(store.arena);
    store.setContext(ctxId);
    playSystemPing();
    addToast({
      title: `CONTEXT: ${CONTEXTS[ctxId].label}`,
      message: `Arena: ${targetArena} · Fuel picks updated`,
      variant: "info",
      duration: 2200,
    });
  }

  function handleToggleLowMana() {
    const next = !store.lowMana;
    store.toggleLowMana();
    playSystemPing();
    addToast({
      title: next ? "LOW MANA MODE ON" : "LOW MANA MODE OFF",
      message: next
        ? "Switched to 2 recovery sets @ RIR 2-3 (zero failure)."
        : "Restored Regular volume.",
      variant: "info",
      duration: 2400,
    });
  }

  function handleToggleDebloat() {
    const next = !store.debloatMode;
    store.toggleDebloat();
    playSystemPing();
    addToast({
      title: next ? "36H DE-BLOAT MODE ON" : "36H DE-BLOAT MODE OFF",
      message: next
        ? "Hydration & clean protein guard active."
        : "De-bloat guard cleared.",
      variant: "info",
      duration: 2400,
    });
  }

  function handleQuickPages(delta: number) {
    if (!activeBook) return;
    const targetPage = activeBook.currentPage + delta;
    const res = store.logBookPagesDelta(activeBook.id, delta);
    if (res.floorJustCleared) {
      playShadowArise();
      addToast({
        title: `DAILY READING FLOOR CLEARED (+${res.xpAwarded} XP)`,
        message: `${activeBook.title} · now p. ${targetPage} (${res.todayPages}/${readingMin}p today)`,
        variant: "quest",
        duration: 2400,
      });
    } else if (res.finishedBook) {
      playShadowArise();
      addToast({
        title: `FINISHED: ${activeBook.title.toUpperCase()}`,
        message: `Reached p. ${targetPage}`,
        variant: "success",
      });
    } else {
      playQuestComplete();
      addToast({
        title: `+${delta} PAGES LOGGED`,
        message: `${activeBook.title} · now p. ${targetPage} (${res.todayPages}/${readingMin}p today)`,
        variant: "success",
        duration: 2000,
      });
    }
  }

  function handleFoodChip(presetId: string) {
    const res = store.logFoodPreset(presetId, 1);
    if (res.isAbsRaid) {
      playShadowArise();
      addToast({
        title: `AB's LUNCH RAID LOGGED (+${res.xpAwarded} XP)`,
        message: "160g P single-sitting bolus · OMAD auto-sealed!",
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
      title: next ? "OMAD · DINNER OUT MODE" : "OMAD · DAYTIME DEFAULT",
      message: next
        ? "Coach recalculated evening OMAD protein & calorie budget."
        : "Seal your OMAD window cleanly to earn +30 XP.",
      variant: "info",
      duration: 2200,
    });
  }

  function handleLockDinnerSkip() {
    const res = store.lockDinnerSkip();
    if (res.alreadyLocked) return;
    playShadowArise();
    addToast({
      title: "OMAD WINDOW SEALED",
      message: `Fasting window locked · +${res.xpAwarded} XP · Swiggy intercepted`,
      variant: "quest",
    });
  }

  function handleSaveWeight(overrideKg?: number) {
    const kgToSave = overrideKg ?? draftWeight;
    const bfNum = draftBf.trim() ? Number(draftBf) : null;
    const bwNum = draftBw.trim() ? Number(draftBw) : null;
    const res = store.logScaleWeight(kgToSave, bfNum, bwNum);
    playSystemPing();
    setBlePendingConfirmKg(null);
    setWeightEditorOpen(false);
    addToast({
      title: `TREND UPDATED: ${res.ema} KG`,
      message: `Raw ${res.raw} kg${bfNum ? ` · ${bfNum}% BF` : ""} smoothed deterministically`,
      variant: "info",
    });
  }

  async function handleBleScan() {
    if (bleBusy) return;
    setBleBusy(true);
    setBlePendingConfirmKg(null);
    try {
      const reading = await readBleScaleWeight();
      setDraftWeight(reading.weightKg);
      if (Math.abs(reading.weightKg - store.rawWeight) > 12) {
        setBlePendingConfirmKg(reading.weightKg);
        playSystemPing();
        addToast({
          title: `CONFIRM SCALE READ: ${reading.weightKg} KG`,
          message: "Large jump from last weight - confirm inside Weight sheet.",
          variant: "warning",
        });
        return;
      }
      handleSaveWeight(reading.weightKg);
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

  function handleRitual(kind: "water" | "electrolytes" | "creatine", label: string) {
    const res = store.toggleDailyRitual(kind);
    playSystemPing();
    if (res.done && res.xpAwarded > 0) {
      addToast({
        title: `${label.toUpperCase()} LOCKED (+${res.xpAwarded} XP)`,
        variant: "success",
        duration: 1600,
      });
    }
  }

  const activeSplitSpec =
    SPLITS.find((s) => s.id === store.split) ?? SPLITS[0];
  const coreSplits = SPLITS.filter((s) => s.tier === "core");
  const comboSplits = SPLITS.filter((s) => s.tier === "combo");
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
  const sleepLowAlert = Boolean(
    today.sleepHours && today.sleepHours > 0 && today.sleepHours < 5.5 && !store.lowMana
  );

  const quickThreePresets = useMemo(() => {
    const others = contextPresets.filter((p) => p.id !== "whey_skyr_seal");
    const seal = contextPresets.find((p) => p.id === "whey_skyr_seal");
    return [...others.slice(0, 2), ...(seal ? [seal] : [])].slice(0, 3);
  }, [contextPresets]);

  const rawVsEmaDelta = weightTrend.rawVsEmaDeltaKg;

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-4">
      {/* 1. SOLO LEVELING MINIMAL TOP BAR */}
      <header className="h-11 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <h1 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold tracking-wider uppercase text-[var(--text-primary)] shrink-0">
            Monarch
          </h1>
          <Link
            href="/status"
            className="px-1.5 py-0.5 rounded-full bg-[#3b6cf6]/15 border border-[#3b6cf6]/35 font-mono text-[10px] font-semibold text-[#93c5fd] whitespace-nowrap shrink-0 hover:border-[#3b6cf6]"
            title={`Lv.${lvl.level} · ${lvl.rank.title} · Hunter Status`}
          >
            Lv.{lvl.level} ·{" "}
            {lvl.rank.title
              .replace("-Rank", "")
              .replace(" Level", "")
              .replace("Shadow ", "")}
          </Link>
          <button
            onClick={() => setContextSheetOpen(true)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-[var(--surface-2)] text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            <span>{CONTEXTS[store.context].shortLabel}</span>
            <ChevronDown size={11} />
          </button>
        </div>

        <button
          onClick={openWeightEditor}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] font-mono tabular-nums text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors whitespace-nowrap shrink-0"
          title={`Trend ${store.weightEma} kg · Raw ${store.rawWeight} kg`}
        >
          <Scale size={12} className="text-[var(--text-secondary)]" />
          <span>{store.weightEma} kg</span>
          {Math.abs(rawVsEmaDelta) >= 1.0 && (
            <span
              className={`text-[10px] ${
                rawVsEmaDelta > 0 ? "text-[#fbbf24]" : "text-[#4ade80]"
              }`}
            >
              {rawVsEmaDelta > 0 ? `+${rawVsEmaDelta}` : rawVsEmaDelta}
            </span>
          )}
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
                totals.proteinG >= totals.targetProteinG - 20 ? "progress-green" : "progress-blue"
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

      {/* DAILY OMAD & HYDRATION RITUALS STRIP */}
      <section className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => handleRitual("water", "4L Water")}
          className={`h-9 px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors ${
            today.waterDone
              ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
              : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Droplets size={12} />
          <span>4L Water</span>
        </button>

        <button
          onClick={() => handleRitual("electrolytes", "Electrolytes")}
          className={`h-9 px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors ${
            today.electrolytesDone
              ? "bg-[#3b6cf6]/15 border-[#3b6cf6]/35 text-[#93c5fd]"
              : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Zap size={12} />
          <span>Salt/ORS</span>
        </button>

        <button
          onClick={() => handleRitual("creatine", "Creatine 5g")}
          className={`h-9 px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors ${
            today.creatineDone
              ? "bg-[#8b5cf6]/15 border-[#8b5cf6]/35 text-[#c4b5fd]"
              : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Pill size={12} />
          <span>Creatine</span>
        </button>

        <div
          className={`h-9 px-2 rounded-xl border text-[11px] font-mono inline-flex items-center justify-center gap-1 ${
            today.sleepHours && today.sleepHours < 5.5
              ? "bg-[#f59e0b]/15 border-[#f59e0b]/35 text-[#fbbf24]"
              : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-muted)]"
          }`}
          title="Sleep synced from Health Connect"
        >
          <Moon size={12} />
          <span>{today.sleepHours ? `${today.sleepHours}h` : "Sleep"}</span>
        </div>
      </section>

      {/* OPTIONAL ACTIONABLE SYSTEM BANNERS */}
      {(store.coachBanner.trim() ||
        activeResume ||
        sleepLowAlert ||
        deload.recommended ||
        actionableDirective) && (
        <div className="space-y-2.5">
          {store.coachBanner.trim() && (
            <div className="rounded-2xl px-4 py-3 bg-[var(--surface-1)] border border-[#f59e0b]/35 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-primary)] leading-snug">
                <span className="font-semibold text-[#fbbf24] mr-1.5">System Note:</span>
                {store.coachBanner}
              </p>
            </div>
          )}

          {sleepLowAlert && (
            <div className="rounded-2xl px-4 py-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/35 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#c4b5fd]">
                  BERU · SHORT SLEEP DETECTED ({today.sleepHours}h)
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Switch to Low Mana (2 sets @ RIR 2-3) to protect recovery.
                </p>
              </div>
              <button
                onClick={handleToggleLowMana}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#8b5cf6] text-white text-xs font-semibold"
              >
                Low Mana
              </button>
            </div>
          )}

          {deload.recommended && (
            <div className="rounded-2xl px-4 py-3 bg-[#f59e0b]/10 border border-[#f59e0b]/35 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#fbbf24]">
                  RECOVERY GATE · DELOAD DUE
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {deload.reason}
                </p>
              </div>
              <button
                onClick={() => {
                  store.markDeloadWeek();
                  playSystemPing();
                  addToast({
                    title: "DELOAD WEEK STARTED",
                    message: "Switched to RIR 2-3 recovery volume for 7 days.",
                    variant: "info",
                  });
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs font-medium text-[var(--text-primary)]"
              >
                Deload
              </button>
            </div>
          )}

          {activeResume && (
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
          )}

          {actionableDirective && (
            <div
              className={`rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 ${
                actionableDirective.soldier === "Beru"
                  ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/35"
                  : actionableDirective.soldier === "Tusk"
                    ? "bg-[#f59e0b]/10 border-[#f59e0b]/35"
                    : "bg-[var(--surface-1)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                  {actionableDirective.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-snug mt-0.5">
                  {actionableDirective.message}
                </p>
              </div>
              {actionableDirective.actionLabel && (
                <button
                  onClick={handleDirectiveAction}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
                >
                  {actionableDirective.actionKind === "seal_whey"
                    ? "Add Whey+Skyr"
                    : actionableDirective.actionKind === "lock_skip"
                      ? "Close OMAD"
                      : actionableDirective.actionKind === "floor_5m"
                        ? "5m Floor"
                        : "De-bloat meal"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. TODAY'S GATE WORKOUT CARD */}
      <section className="rounded-2xl monarch-hero p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-medium ${
                weekly.coreDoneCount >= 3 ? "text-[#4ade80]" : "text-[var(--text-secondary)]"
              }`}
            >
              This week · {weekly.coreDoneCount}/3 min
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
          <h2 className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold tracking-wide text-[var(--text-primary)]">
            {splitTitle}
          </h2>
          {workoutDoneToday ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22c55e]/15 text-[#4ade80] text-[11px] font-medium">
              <Check size={11} /> Done
            </span>
          ) : today.restDay ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3b6cf6]/15 text-[#93c5fd] text-[11px] font-medium">
              Rest day
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-snug">
          {activeSplitSpec.focus} · {formatArenaTitle(store.arena)} · {prescribedPreview.length} exercises
        </p>

        {/* 3-Mode Training Effort Selector */}
        <div className="mt-4 bg-[var(--surface-0)] p-1 rounded-xl grid grid-cols-3 gap-1">
          {(
            [
              { id: "regular", label: "Regular 3x" },
              { id: "express_2x", label: "Low Time 2x" },
              { id: "low_mana_rir2", label: "Low Mana RIR2" },
            ] as { id: GateRankId; label: string }[]
          ).map((mode) => {
            const active = normGateRank === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => store.setGateRank(mode.id)}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? mode.id === "low_mana_rir2"
                      ? "bg-[#8b5cf6]/25 text-[#c4b5fd]"
                      : "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {mode.label}
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
                Weekend 7-Lift Heavy (75-90m)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {comboSplits.map((sp) => {
                  const doneCount = weekly.completedThisWeek[sp.id] ?? 0;
                  const isSelected = store.split === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => store.setSplit(sp.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border flex flex-col items-center gap-0.5 transition-colors ${
                        isSelected
                          ? "bg-[var(--surface-2)] border-[#3b6cf6] text-[var(--text-primary)]"
                          : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {doneCount > 0 && <Check size={11} className="text-[#4ade80]" />}
                        <span>{sp.shortLabel}</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {sp.id === "ul_combo_a" ? "Upper A + Quads" : "Upper B + Hinge"}
                      </span>
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
          </div>
        )}

        <button
          onClick={() => setCombatOpen(true)}
          className="mt-4 h-12 w-full rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-semibold text-sm text-white transition-colors"
        >
          {activeResume
            ? `Resume ${splitTitle} (${activeResume.checkedSets}/${activeResume.totalSets})`
            : `Enter ${splitTitle} Gate`}
        </button>

        {/* Quick Workout Modes: 5m No-Skip, Cardio & Rest */}
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <button
            onClick={handleClear5mFloor}
            className={`h-9 px-1 rounded-xl text-[11px] font-medium border transition-colors truncate ${
              today.survivalFloorCleared
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
                : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            5m Floor
          </button>
          <button
            onClick={() => handleQuickMove("zone2_jog")}
            className={`h-9 px-1 rounded-xl text-[11px] font-medium border transition-colors truncate ${
              today.movements.some((m) => m.kind === "zone2_jog")
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
                : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Jog
          </button>
          <button
            onClick={() => handleQuickMove("brisk_walk")}
            className={`h-9 px-1 rounded-xl text-[11px] font-medium border transition-colors truncate ${
              today.movements.some((m) => m.kind === "brisk_walk")
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
                : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Walk
          </button>
          <button
            onClick={() => handleQuickMove("cg_swim")}
            className={`h-9 px-1 rounded-xl text-[11px] font-medium border transition-colors truncate ${
              today.movements.some((m) => m.kind === "cg_swim")
                ? "bg-[#22c55e]/15 border-[#22c55e]/35 text-[#4ade80]"
                : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Pool
          </button>
          <button
            onClick={handleToggleRestDay}
            className={`h-9 px-1 rounded-xl text-[11px] font-medium border transition-colors truncate ${
              today.restDay
                ? "bg-[#3b6cf6]/15 border-[#3b6cf6]/40 text-[#93c5fd]"
                : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Rest
          </button>
        </div>

        {today.movements.length > 0 && (
          <p className="mt-2 text-[11px] text-[var(--text-muted)] truncate">
            Today: {today.movements.map((m) => m.label).join(" · ")}
          </p>
        )}
      </section>

      {/* 4. FUEL CARD */}
      <section className="rounded-2xl monarch-card p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold tracking-wide text-[var(--text-primary)]">
            Fuel · OMAD
          </h2>
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
              title="Switch today between OMAD Default & Dinner Out budget"
            >
              {dinnerOutMode
                ? "OMAD · Dinner out"
                : today.dinnerSkipped
                  ? "OMAD sealed ✓"
                  : "OMAD · Default"}
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
                <span>OMAD sealed</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>Close OMAD</span>
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
              const tags = FOOD_PRESETS.find((p) => p.id === entry.presetId)?.tags;
              const v = evaluateFoodViability(entry.kcal, entry.proteinG, tags);
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
                        ·{" "}
                        {entry.slot === "lunch"
                          ? "OMAD"
                          : entry.slot === "seal"
                            ? "Seal"
                            : entry.slot === "dinner"
                              ? "Dinner"
                              : "Extra"}
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

      {/* 5. READING CARD */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-[#60a5fa]" />
            <h2 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold tracking-wide text-[var(--text-primary)]">
              Reading
            </h2>
            {readingStreak > 0 && (
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                · {readingStreak}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium ${
                readingDone
                  ? "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
              }`}
            >
              {todayPages} / {readingMin} pages
            </span>
            <button
              onClick={() => {
                setReadingSheetMode(activeBook ? "update" : "add");
                setReadingSheetOpen(true);
              }}
              className="px-2.5 py-1 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Books
            </button>
          </div>
        </div>

        {activeBook ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {activeBook.title}
                </p>
                <span className="font-mono tabular-nums text-xs text-[var(--text-secondary)] shrink-0">
                  p. {activeBook.currentPage}
                  {activeBook.totalPages ? ` / ${activeBook.totalPages}` : ""}
                </span>
              </div>
              {activeBook.totalPages && activeBook.totalPages > 0 && (
                <div className="h-1 rounded-full bg-[var(--surface-0)] overflow-hidden">
                  <div
                    className="h-full progress-blue transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((activeBook.currentPage / activeBook.totalPages) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickPages(5)}
                className="h-10 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                +5 pages
              </button>
              <button
                onClick={() => handleQuickPages(10)}
                className="h-10 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                +10 pages
              </button>
              <button
                onClick={() => {
                  setReadingSheetMode("update");
                  setReadingSheetOpen(true);
                }}
                className="h-10 rounded-xl bg-[var(--surface-0)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-medium text-[#60a5fa] transition-colors"
              >
                Update page
              </button>
            </div>

            {(today.readingLogs ?? []).length > 0 && (
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                Latest:{" "}
                {(() => {
                  const last = (today.readingLogs ?? [])[
                    (today.readingLogs ?? []).length - 1
                  ];
                  const sign =
                    last.pagesDelta > 0 ? `+${last.pagesDelta}` : `${last.pagesDelta}`;
                  return `p. ${last.fromPage} -> ${last.toPage} (${sign}p)`;
                })()}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-muted)]">
              Track your current book &amp; page (min {readingMin} pages/day).
            </p>
            <button
              onClick={() => {
                setReadingSheetMode("add");
                setReadingSheetOpen(true);
              }}
              className="shrink-0 h-9 px-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
            >
              <Plus size={13} />
              <span>Add current book</span>
            </button>
          </div>
        )}
      </section>

      {/* MODULAR BOTTOM SHEETS */}
      <CombatSheet open={combatOpen} onClose={() => setCombatOpen(false)} />
      <FuelSheet
        open={fuelSheetOpen}
        onClose={() => setFuelSheetOpen(false)}
      />
      <MealPlanSheet
        open={mealPlanOpen}
        onClose={() => setMealPlanOpen(false)}
      />
      <ReadingSheet
        open={readingSheetOpen}
        onClose={() => setReadingSheetOpen(false)}
        initialMode={readingSheetMode}
      />

      {/* BOTTOM SHEET: SCALE & BODY COMP (TREND-SHIELDED) */}
      <SheetModal
        open={weightEditorOpen}
        onClose={() => setWeightEditorOpen(false)}
        title="Weight & 14d Trend"
      >
        <div className="p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-primary)]">
              Trend: <span className="font-mono text-[#60a5fa]">{store.weightEma} kg</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              Best {store.bestWeightEma} kg · Raw {store.rawWeight} kg
            </span>
          </div>
          <WeightTrendChart series={weightTrend.series14d} height={110} compact />
          <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
            {weightTrend.fluctuationNote}
          </p>
        </div>

        {blePendingConfirmKg !== null && (
          <div className="p-3 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 space-y-2">
            <p className="text-xs font-semibold text-[#fbbf24]">
              BLE Scale read {blePendingConfirmKg} kg (large delta from {store.rawWeight} kg)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveWeight(blePendingConfirmKg)}
                className="flex-1 h-9 rounded-lg bg-[#f59e0b] text-[#0b0c10] text-xs font-semibold"
              >
                Confirm {blePendingConfirmKg} kg
              </button>
              <button
                onClick={() => setBlePendingConfirmKg(null)}
                className="h-9 px-3 rounded-lg bg-[var(--surface-2)] text-xs text-[var(--text-secondary)]"
              >
                Ignore
              </button>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-[var(--surface-0)] flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--text-secondary)]">Raw weigh-in (kg)</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Alpha 0.14 deterministic EMA
            </p>
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
            onClick={() => handleSaveWeight()}
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
              <span>{bleBusy ? "Stabilizing..." : "Scan BLE Scale"}</span>
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
            Log activity (+Kilimanjaro vertical &amp; Zone-2 min)
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
                onClick={() => handleSelectContext(ctx.id)}
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

        <div className="p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#60a5fa]">
              {CONTEXTS[store.context].label} rules
            </span>
            <span className="font-mono text-[var(--text-muted)]">
              Arena: {formatArenaTitle(store.arena)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-snug">
            {CONTEXTS[store.context].avoidNote}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleToggleLowMana}
            className="w-full p-3 rounded-xl bg-[var(--surface-0)] flex items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                Low mana mode (Beru)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Short sleep -&gt; 2 sets @ RIR 2-3 (no failure)
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                store.lowMana
                  ? "bg-[#8b5cf6]/25 text-[#c4b5fd]"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              }`}
            >
              {store.lowMana ? "On" : "Off"}
            </span>
          </button>

          <button
            onClick={handleToggleDebloat}
            className="w-full p-3 rounded-xl bg-[var(--surface-0)] flex items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                36h de-bloat mode (Tusk)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Highlights hydration &amp; lean food guard
              </p>
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
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#60a5fa]" />
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">Sound cues</p>
                <p className="text-[11px] text-[var(--text-muted)]">Set timer chime &amp; completion tones</p>
              </div>
            </div>
            <MuteToggle />
          </div>
        </div>
      </SheetModal>
    </div>
  );
}
