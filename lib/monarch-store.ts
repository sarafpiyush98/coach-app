"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  autoDetectContext,
  CONTEXTS,
  FOOD_PRESETS,
  GATE_RANKS,
  type ArenaId,
  type ContextId,
  type GateRankId,
  type SplitId,
} from "./monarch-catalog";
import { getHunterRank, type HunterRank } from "./ranks";
import { calculateStats, type PlayerStats } from "./stats";

// ============================================================
// IndexedDB Storage with Graceful localStorage Fallback
// ============================================================

const DB_NAME = "monarch-system-v2";
const STORE_NAME = "kv";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const monarchIdbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    try {
      const db = await openIdb();
      const val = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(name);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      });
      if (val !== null) return val;
    } catch {
      // fall through to localStorage
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore quota/private mode error
    }
    try {
      const db = await openIdb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(value, name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // localStorage fallback already persisted
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
    try {
      const db = await openIdb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).delete(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  },
};

// ============================================================
// Types
// ============================================================

export interface FoodLogEntry {
  id: string;
  timeIso: string;
  label: string;
  kcal: number;
  proteinG: number;
  multiplier: number;
  isAbsRaid?: boolean;
  isSeal?: boolean;
  spot?: string;
}

export interface WorkoutLogSummary {
  id: string;
  timeIso: string;
  split: SplitId;
  arena: ArenaId;
  gateRank: GateRankId;
  setsCompleted: number;
  benchWeightKg?: number;
  benchReps?: number;
  e1rm?: number;
  verticalGainM: number;
  xpAwarded: number;
}

export type MovementKind =
  | "steps_10k"
  | "steps_15k"
  | "cg_swim"
  | "badminton_2h"
  | "sunrise_trek";

export interface MovementLogEntry {
  id: string;
  timeIso: string;
  kind: MovementKind;
  label: string;
  verticalGainM: number;
  grantsFlex: boolean;
  xpAwarded: number;
}

export interface DayRecord {
  date: string;
  foods: FoodLogEntry[];
  workouts: WorkoutLogSummary[];
  movements: MovementLogEntry[];
  dinnerSkipped: boolean;
  earlySealXpAwarded: boolean;
  survivalFloorCleared: boolean;
  gluttonyRaidAwarded: boolean;
  activeFlexKcal: number;
  scaleWeightKg: number | null;
  bodyFatPct: number | null;
  bodyWaterPct: number | null;
  samsungSteps: number;
  hcStepsLive?: boolean;
  pendingStepReset?: boolean;
  steps10kAwarded: boolean;
  steps15kAwarded: boolean;
}

export interface BenchBest {
  weightKg: number;
  reps: number;
  e1rm: number;
  updatedAt?: string;
}

export interface ActiveWorkoutSession {
  date: string;
  split: SplitId;
  arena: ArenaId;
  gateRank: GateRankId;
  completedSets: Record<string, boolean[]>;
  benchWeight: number;
  benchReps: number;
  lastSetAtMs: number | null;
}

export interface MonarchPersistedState {
  context: ContextId;
  split: SplitId;
  arena: ArenaId;
  gateRank: GateRankId;
  lowMana: boolean;
  debloatMode: boolean;
  legacyXp: number;
  legacyWorkouts: number;
  earnedXp: number;
  totalPrs: number;
  weightEma: number;
  rawWeight: number;
  bodyFatPct: number | null;
  bodyWaterPct: number | null;
  stepTarget: number;
  coachBanner: string;
  ledgerSheetId: string;
  lastSyncedAt: string | null;
  pendingSyncDates: string[];
  benchBest: BenchBest;
  kiliMeters: number;
  lateNightsSaved: number;
  webhookUrl: string;
  swappedExercises: Record<string, boolean>;
  activeSession: ActiveWorkoutSession | null;
  days: Record<string, DayRecord>;
}

export interface MonarchActions {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setContext: (c: ContextId) => void;
  setSplit: (s: SplitId) => void;
  setArena: (a: ArenaId) => void;
  setGateRank: (g: GateRankId) => void;
  toggleLowMana: () => void;
  toggleDebloat: () => void;
  toggleExerciseSwap: (exerciseId: string) => void;
  syncActiveSession: (patch: Partial<ActiveWorkoutSession> & { reset?: boolean }) => void;
  toggleActiveSet: (
    meta: { split: SplitId; arena: ArenaId; gateRank: GateRankId; exId: string; setIdx: number; totalSetsForEx: number }
  ) => { turnedOn: boolean };
  clearActiveRestTimer: () => void;
  discardActiveSession: () => void;
  clearSurvivalFloor: () => { xpAwarded: number; alreadyCleared: boolean };
  completeGateWorkout: (input: {
    split: SplitId;
    arena: ArenaId;
    gateRank: GateRankId;
    setsCompleted: number;
    benchWeightKg?: number;
    benchReps?: number;
    verticalGainM?: number;
  }) => { xpAwarded: number; isPr: boolean; newE1rm?: number };
  logQuickMovement: (kind: MovementKind) => { xpAwarded: number; verticalGainM: number };
  logFoodPreset: (presetId: string, multiplier?: number) => {
    xpAwarded: number;
    isAbsRaid: boolean;
    label: string;
  };
  logCustomFood: (label: string, kcal: number, proteinG: number) => { xpAwarded: number };
  removeFoodEntry: (dateKey: string, entryId: string) => void;
  lockDinnerSkip: () => { xpAwarded: number; alreadyLocked: boolean };
  logScaleWeight: (
    kg: number,
    bodyFatPct?: number | null,
    bodyWaterPct?: number | null
  ) => { ema: number; raw: number };
  setSamsungSteps: (steps: number, allowLower?: boolean) => { xpAwarded: number; verticalGainM: number };
  setWebhookUrl: (url: string) => void;
  syncWithLedger: () => Promise<{ ok: boolean; message: string }>;
  exportJson: () => string;
  importJson: (raw: string) => { ok: boolean; error?: string };
}

export type MonarchStore = MonarchPersistedState & MonarchActions;

// ============================================================
// Pure Helpers
// ============================================================

export function getTodayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createEmptyDay(date: string): DayRecord {
  return {
    date,
    foods: [],
    workouts: [],
    movements: [],
    dinnerSkipped: false,
    earlySealXpAwarded: false,
    survivalFloorCleared: false,
    gluttonyRaidAwarded: false,
    activeFlexKcal: 0,
    scaleWeightKg: null,
    bodyFatPct: null,
    bodyWaterPct: null,
    samsungSteps: 0,
    steps10kAwarded: false,
    steps15kAwarded: false,
  };
}

export function epley1Rm(weightKg: number, reps: number): number {
  if (reps <= 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Calibrated v2 XP curve: 90 + (L - 1) * 22.
 * At legacyXp = 4850, Piyush starts awakened at Level 18 (B-Rank, 71% progress),
 * and each subsequent level takes ~2-4 active days (~460-950 XP).
 */
export function xpForLevelStep(level: number): number {
  return 90 + Math.max(level - 1, 0) * 22;
}

export function levelFromMonarchXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpIntoLevel: number;
  xpNeeded: number;
  progress: number;
  rank: HunterRank;
} {
  let level = 1;
  let consumed = 0;
  while (true) {
    const step = xpForLevelStep(level);
    if (consumed + step > totalXp) {
      const xpIntoLevel = Math.max(totalXp - consumed, 0);
      return {
        level,
        currentLevelXp: step,
        xpIntoLevel,
        xpNeeded: step - xpIntoLevel,
        progress: Math.min((xpIntoLevel / step) * 100, 99.9),
        rank: getHunterRank(level),
      };
    }
    consumed += step;
    level++;
  }
}

export function isDayActive(day: DayRecord | undefined): boolean {
  if (!day) return false;
  return (
    day.survivalFloorCleared ||
    day.workouts.length > 0 ||
    day.movements.length > 0 ||
    day.foods.length > 0 ||
    day.dinnerSkipped ||
    (day.samsungSteps ?? 0) >= 8000
  );
}

export function getDailyTotals(day: DayRecord | undefined) {
  const foods = day?.foods ?? [];
  const kcal = foods.reduce((acc, f) => acc + f.kcal, 0);
  const proteinG = foods.reduce((acc, f) => acc + f.proteinG, 0);
  const activeFlexKcal = day?.activeFlexKcal ?? 0;
  const targetKcal = 1800 + activeFlexKcal;
  const targetProteinG = 165;
  const hasSealOrAbs = foods.some((f) => f.isAbsRaid || f.isSeal);
  const needsProteinSeal =
    proteinG > 0 && proteinG < 50 && !day?.dinnerSkipped && !hasSealOrAbs;
  return {
    kcal,
    proteinG,
    activeFlexKcal,
    targetKcal,
    targetProteinG,
    isActive: isDayActive(day),
    needsProteinSeal,
  };
}

export function computeStreakAndCombo(
  days: Record<string, DayRecord>,
  today: Date = new Date()
): {
  activeStreak: number;
  fastingStreak: number;
  comboDay: number;
  comboMultiplier: number;
  igrisShieldedThisWeek: boolean;
} {
  let activeStreak = 0;
  let fastingStreak = 0;
  let shieldAvailable = true;
  let igrisShieldedThisWeek = false;

  const todayKey = getTodayKey(today);
  const todayDone = isDayActive(days[todayKey]);

  // Count backward up to 90 days; allow 1 missed gap in recent 7d via Igris shield
  const startOffset = todayDone ? 0 : 1;
  for (let i = startOffset; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getTodayKey(d);
    const rec = days[key];
    if (isDayActive(rec)) {
      activeStreak++;
      if (rec?.dinnerSkipped) {
        fastingStreak++;
      }
    } else if (i < 7 && shieldAvailable && activeStreak > 0) {
      shieldAvailable = false;
      igrisShieldedThisWeek = true;
    } else {
      break;
    }
  }

  // Awakening baseline ensures combo feels alive from Day 1
  const comboDay = Math.max(activeStreak, 1);
  const comboMultiplier = Math.min(2.5, Math.round((1 + (comboDay - 1) * 0.1) * 10) / 10);

  return {
    activeStreak,
    fastingStreak,
    comboDay,
    comboMultiplier,
    igrisShieldedThisWeek,
  };
}

export function computeMonarchStats(state: MonarchPersistedState): PlayerStats {
  const allDays = Object.values(state.days);
  const totalWorkouts =
    state.legacyWorkouts +
    allDays.reduce((s, d) => s + d.workouts.length + (d.survivalFloorCleared ? 1 : 0), 0);
  const totalMealsLogged = 120 + allDays.reduce((s, d) => s + d.foods.length, 0);
  const totalCheckins =
    82 +
    allDays.reduce((s, d) => s + d.movements.length + (d.dinnerSkipped ? 1 : 0), 0);
  const { activeStreak, fastingStreak, comboDay } = computeStreakAndCombo(state.days);
  const lvl = levelFromMonarchXp(state.legacyXp + state.earnedXp).level;

  return calculateStats({
    totalWorkouts,
    totalPrs: state.totalPrs,
    totalCheckins,
    totalMealsLogged,
    bestExerciseStreak: Math.max(14, activeStreak),
    bestLoggingStreak: Math.max(12, activeStreak),
    bestNoLateEatingStreak: Math.max(6, state.lateNightsSaved + fastingStreak),
    bestCombo: Math.max(14, comboDay),
    consecutiveGoodWeeks: 4,
    level: lvl,
  });
}

export interface AmbientShadowDirective {
  soldier: "Tusk" | "Greed" | "Beru" | "Igris";
  color: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionKind?: "seal_whey" | "lock_skip" | "floor_5m" | "debloat_food";
}

export function getAmbientShadow(
  state: MonarchPersistedState,
  now: Date = new Date()
): AmbientShadowDirective | null {
  const key = getTodayKey(now);
  const day = state.days[key];
  const totals = getDailyTotals(day);
  const hour = now.getHours();

  if (state.lowMana && !totals.isActive) {
    return {
      soldier: "Beru",
      color: "#8b5cf6",
      title: "BERU · LOW-MANA OVERRIDE",
      message: "Short sleep or fatigued? Clear only the 5m Survival Floor and protect the chain.",
      actionLabel: "CLEAR 5m FLOOR",
      actionKind: "floor_5m",
    };
  }

  if (state.debloatMode) {
    return {
      soldier: "Tusk",
      color: "#f59e0b",
      title: "TUSK · 36H DE-BLOAT RITUAL",
      message: "4L water + electrolytes + potassium; stick to high-protein cucumber-chicken today.",
      actionLabel: "LOG DE-BLOAT BOWL",
      actionKind: "debloat_food",
    };
  }

  if (totals.needsProteinSeal) {
    return {
      soldier: "Greed",
      color: "#f59e0b",
      title: "GREED · LOW-PROTEIN LUNCH GUARD",
      message: `${totals.proteinG}g P logged so far. Add 5 PM 2x Whey+Skyr (+70g P) before skipping dinner or you will crash at 11:30 PM.`,
      actionLabel: "LOG 5 PM WHEY+SKYR",
      actionKind: "seal_whey",
    };
  }

  if (hour >= 17 && totals.proteinG >= 100 && !day?.dinnerSkipped) {
    return {
      soldier: "Greed",
      color: "#8b5cf6",
      title: "GREED · FASTING WINDOW READY",
      message: `${totals.proteinG}g P already locked. Seal Dinner Skip now (+30 XP) and pocket midnight Swiggy savings.`,
      actionLabel: "LOCK DINNER SKIP",
      actionKind: "lock_skip",
    };
  }

  const streak = computeStreakAndCombo(state.days, now);
  if (!totals.isActive) {
    return {
      soldier: "Igris",
      color: "#3b6cf6",
      title: `IGRIS · DAILY GATE (${streak.comboMultiplier}x COMBO)`,
      message: `One 5m Floor, movement log, or lunch entry locks today green (${streak.igrisShieldedThisWeek ? "Weekly Igris Shield active" : "Igris Shield ready"}).`,
    };
  }

  return null;
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const DEFAULT_LEDGER_SHEET_ID = "17JNkD65FyxmWtl6iR1bvAYrXq4w8b0fWbq43VKwfR20";
export const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxC324Dza-ITDsejFUcPnPLtiQDMvMhpkMrlk48Rwb8a8JjZctF8d7PAU7NKSkkVEQt1g/exec";

function enqueuePending(existing: string[], dateKey: string): string[] {
  return existing.includes(dateKey) ? existing : [...existing, dateKey];
}

function fireWebhookIfConfigured(
  webhookUrl: string,
  _event: string,
  _payload: Record<string, unknown>,
  triggerSync?: () => Promise<unknown>
) {
  if (!webhookUrl.trim() || typeof window === "undefined" || !triggerSync) return;
  queueMicrotask(() => {
    triggerSync().catch(() => {});
  });
}

// ============================================================
// Movement Presets
// ============================================================

export const MOVEMENT_PRESETS: Record<
  MovementKind,
  { label: string; verticalGainM: number; grantsFlex: boolean; xp: number }
> = {
  steps_10k: { label: "10k Steps Walk", verticalGainM: 45, grantsFlex: false, xp: 30 },
  steps_15k: { label: "15k Zone-2 Reset", verticalGainM: 80, grantsFlex: false, xp: 45 },
  cg_swim: { label: "30m CG Pool (Post-Lift)", verticalGainM: 75, grantsFlex: true, xp: 45 },
  badminton_2h: { label: "Sun 2h Badminton", verticalGainM: 120, grantsFlex: true, xp: 60 },
  sunrise_trek: { label: "Sunrise Hill Trek", verticalGainM: 185, grantsFlex: true, xp: 75 },
};

// ============================================================
// Seed Initial State & Zustand Store
// ============================================================

const INITIAL_PERSISTED_STATE: MonarchPersistedState = {
  context: typeof window !== "undefined" ? autoDetectContext() : "cg_home",
  split: "push",
  arena: "cg_gym",
  gateRank: "express_25m",
  lowMana: false,
  debloatMode: false,
  legacyXp: 4850,
  legacyWorkouts: 82,
  earnedXp: 0,
  totalPrs: 3,
  weightEma: 112.4,
  rawWeight: 112.4,
  bodyFatPct: null,
  bodyWaterPct: null,
  stepTarget: 12000,
  coachBanner: "",
  ledgerSheetId: DEFAULT_LEDGER_SHEET_ID,
  lastSyncedAt: null,
  pendingSyncDates: [],
  benchBest: { weightKg: 50, reps: 15, e1rm: 75, updatedAt: "2026-11-26" },
  kiliMeters: 1240,
  lateNightsSaved: 6,
  webhookUrl: DEFAULT_WEBHOOK_URL,
  swappedExercises: {},
  activeSession: null,
  days: {},
};

export const useMonarchStore = create<MonarchStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_PERSISTED_STATE,
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setContext: (context) =>
        set((s) => ({
          context,
          arena:
            context === "travel"
              ? "nomad_hotel"
              : s.arena === "nomad_hotel"
                ? CONTEXTS[context].defaultArena
                : s.arena,
        })),

      setSplit: (split) => set({ split }),

      setArena: (arena) => set({ arena }),

      setGateRank: (gateRank) => set({ gateRank }),

      toggleLowMana: () =>
        set((s) => ({
          lowMana: !s.lowMana,
          gateRank: !s.lowMana ? "floor_5m" : s.gateRank,
        })),

      toggleDebloat: () => set((s) => ({ debloatMode: !s.debloatMode })),

      toggleExerciseSwap: (exerciseId) =>
        set((s) => ({
          swappedExercises: {
            ...s.swappedExercises,
            [exerciseId]: !s.swappedExercises[exerciseId],
          },
        })),

      syncActiveSession: (patch) => {
        const key = getTodayKey();
        const s = get();
        const current = s.activeSession;
        const base: ActiveWorkoutSession =
          !patch.reset && current && current.date === key
            ? current
            : {
                date: key,
                split: s.split,
                arena: s.arena,
                gateRank: s.gateRank,
                completedSets: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
              };
        const { reset: _reset, ...rest } = patch;
        set({
          activeSession: {
            ...base,
            ...rest,
            date: key,
          },
        });
      },

      toggleActiveSet: ({ split, arena, gateRank, exId, setIdx, totalSetsForEx }) => {
        const key = getTodayKey();
        const s = get();
        const prev =
          s.activeSession &&
          s.activeSession.date === key &&
          s.activeSession.split === split &&
          s.activeSession.arena === arena &&
          s.activeSession.gateRank === gateRank
            ? s.activeSession
            : {
                date: key,
                split,
                arena,
                gateRank,
                completedSets: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
              };

        const existingArr = prev.completedSets[exId] ?? [];
        const padded = Array.from({ length: totalSetsForEx }, (_, i) =>
          Boolean(existingArr[i])
        );
        const turnedOn = !padded[setIdx];
        padded[setIdx] = turnedOn;

        set({
          activeSession: {
            ...prev,
            completedSets: {
              ...prev.completedSets,
              [exId]: padded,
            },
            lastSetAtMs: turnedOn ? Date.now() : prev.lastSetAtMs,
          },
        });
        return { turnedOn };
      },

      clearActiveRestTimer: () =>
        set((s) => ({
          activeSession: s.activeSession
            ? { ...s.activeSession, lastSetAtMs: null }
            : null,
        })),

      discardActiveSession: () => set({ activeSession: null }),

      clearSurvivalFloor: () => {
        const key = getTodayKey();
        const existing = get().days[key] ?? createEmptyDay(key);
        if (existing.survivalFloorCleared || existing.workouts.length > 0) {
          return { xpAwarded: 0, alreadyCleared: true };
        }
        const xpAwarded = 35;
        set((s) => ({
          earnedXp: s.earnedXp + xpAwarded,
          kiliMeters: s.kiliMeters + 25,
          pendingSyncDates: enqueuePending(s.pendingSyncDates, key),
          days: {
            ...s.days,
            [key]: { ...existing, survivalFloorCleared: true },
          },
        }));
        fireWebhookIfConfigured(
          get().webhookUrl,
          "clear_survival_floor",
          { date: key, xpAwarded },
          get().syncWithLedger
        );
        return { xpAwarded, alreadyCleared: false };
      },

      completeGateWorkout: ({
        split,
        arena,
        gateRank,
        setsCompleted,
        benchWeightKg,
        benchReps,
        verticalGainM,
      }) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const rankDef = GATE_RANKS.find((g) => g.id === gateRank) ?? GATE_RANKS[1];
        let xpAwarded = rankDef.baseXp;
        let isPr = false;
        let newE1rm: number | undefined;
        let nextBench = state.benchBest;
        let nextTotalPrs = state.totalPrs;

        if (benchWeightKg && benchReps && benchWeightKg > 0 && benchReps > 0) {
          newE1rm = epley1Rm(benchWeightKg, benchReps);
          if (newE1rm > state.benchBest.e1rm) {
            isPr = true;
            xpAwarded += 75;
            nextTotalPrs += 1;
            nextBench = {
              weightKg: benchWeightKg,
              reps: benchReps,
              e1rm: newE1rm,
              updatedAt: key,
            };
          }
        }

        const gainM =
          verticalGainM ??
          (split === "pool_steps" ? 65 : gateRank === "full_45m" ? 45 : 25);

        const summary: WorkoutLogSummary = {
          id: makeId("wo"),
          timeIso: new Date().toISOString(),
          split,
          arena,
          gateRank,
          setsCompleted,
          benchWeightKg,
          benchReps,
          e1rm: newE1rm,
          verticalGainM: gainM,
          xpAwarded,
        };

        set({
          earnedXp: state.earnedXp + xpAwarded,
          totalPrs: nextTotalPrs,
          benchBest: nextBench,
          kiliMeters: state.kiliMeters + gainM,
          activeSession: null,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              survivalFloorCleared: true,
              workouts: [...existing.workouts, summary],
            },
          },
        });

        fireWebhookIfConfigured(
          state.webhookUrl,
          "complete_workout",
          { date: key, ...summary },
          get().syncWithLedger
        );

        return { xpAwarded, isPr, newE1rm };
      },

      logQuickMovement: (kind) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const spec = MOVEMENT_PRESETS[kind];

        const entry: MovementLogEntry = {
          id: makeId("mv"),
          timeIso: new Date().toISOString(),
          kind,
          label: spec.label,
          verticalGainM: spec.verticalGainM,
          grantsFlex: spec.grantsFlex,
          xpAwarded: spec.xp,
        };

        const nextFlex = spec.grantsFlex
          ? Math.max(existing.activeFlexKcal, 220)
          : existing.activeFlexKcal;

        const curSteps = existing.samsungSteps ?? 0;
        let nextSteps = curSteps;
        let steps10kAwarded = existing.steps10kAwarded ?? false;
        let steps15kAwarded = existing.steps15kAwarded ?? false;
        if (kind === "steps_10k") {
          nextSteps = Math.max(curSteps, 10000);
          steps10kAwarded = true;
        } else if (kind === "steps_15k") {
          nextSteps = Math.max(curSteps, 15000);
          steps10kAwarded = true;
          steps15kAwarded = true;
        }

        set({
          earnedXp: state.earnedXp + spec.xp,
          kiliMeters: state.kiliMeters + spec.verticalGainM,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              activeFlexKcal: nextFlex,
              samsungSteps: nextSteps,
              steps10kAwarded,
              steps15kAwarded,
              movements: [...existing.movements, entry],
            },
          },
        });

        fireWebhookIfConfigured(
          state.webhookUrl,
          "log_movement",
          { date: key, ...entry },
          get().syncWithLedger
        );

        return { xpAwarded: spec.xp, verticalGainM: spec.verticalGainM };
      },

      logFoodPreset: (presetId, multiplier = 1) => {
        const preset = FOOD_PRESETS.find((f) => f.id === presetId);
        if (!preset) {
          return { xpAwarded: 0, isAbsRaid: false, label: "Unknown" };
        }
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);

        const isAbsRaid = preset.tags.includes("abs_raid");
        const isSeal = preset.tags.includes("seal");
        const entry: FoodLogEntry = {
          id: makeId("fd"),
          timeIso: new Date().toISOString(),
          label:
            multiplier === 1 ? preset.shortLabel : `${preset.shortLabel} (${multiplier}x)`,
          kcal: Math.round(preset.kcal * multiplier),
          proteinG: Math.round(preset.proteinG * multiplier),
          multiplier,
          isAbsRaid,
          isSeal,
          spot: preset.spot,
        };

        let xpAwarded = 20;
        let dinnerSkipped = existing.dinnerSkipped;
        let gluttonyRaidAwarded = existing.gluttonyRaidAwarded;
        let lateNightsSaved = state.lateNightsSaved;

        if (isAbsRaid) {
          if (!dinnerSkipped) {
            dinnerSkipped = true;
            lateNightsSaved += 1;
          }
          if (!gluttonyRaidAwarded) {
            gluttonyRaidAwarded = true;
            xpAwarded += 75;
          }
        }

        set({
          earnedXp: state.earnedXp + xpAwarded,
          lateNightsSaved,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              dinnerSkipped,
              gluttonyRaidAwarded,
              foods: [...existing.foods, entry],
            },
          },
        });

        fireWebhookIfConfigured(
          state.webhookUrl,
          "log_food",
          { date: key, ...entry },
          get().syncWithLedger
        );

        return { xpAwarded, isAbsRaid, label: entry.label };
      },

      logCustomFood: (label, kcal, proteinG) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const xpAwarded = 15;
        const entry: FoodLogEntry = {
          id: makeId("fd"),
          timeIso: new Date().toISOString(),
          label: label.trim() || "Custom Meal",
          kcal: Math.max(0, Math.round(kcal)),
          proteinG: Math.max(0, Math.round(proteinG)),
          multiplier: 1,
        };
        set({
          earnedXp: state.earnedXp + xpAwarded,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              foods: [...existing.foods, entry],
            },
          },
        });
        fireWebhookIfConfigured(
          state.webhookUrl,
          "log_custom_food",
          { date: key, ...entry },
          get().syncWithLedger
        );
        return { xpAwarded };
      },

      removeFoodEntry: (dateKey, entryId) => {
        const state = get();
        const day = state.days[dateKey];
        if (!day) return;
        set({
          pendingSyncDates: enqueuePending(state.pendingSyncDates, dateKey),
          days: {
            ...state.days,
            [dateKey]: {
              ...day,
              foods: day.foods.filter((f) => f.id !== entryId),
            },
          },
        });
        fireWebhookIfConfigured(
          state.webhookUrl,
          "remove_food",
          { date: dateKey, entryId },
          get().syncWithLedger
        );
      },

      lockDinnerSkip: () => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        if (existing.dinnerSkipped) {
          return { xpAwarded: 0, alreadyLocked: true };
        }
        const xpAwarded = existing.earlySealXpAwarded ? 0 : 30;
        set({
          earnedXp: state.earnedXp + xpAwarded,
          lateNightsSaved: state.lateNightsSaved + 1,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              dinnerSkipped: true,
              earlySealXpAwarded: true,
            },
          },
        });
        fireWebhookIfConfigured(
          state.webhookUrl,
          "lock_dinner_skip",
          { date: key, xpAwarded },
          get().syncWithLedger
        );
        return { xpAwarded, alreadyLocked: false };
      },

      logScaleWeight: (kg, bodyFatPct = null, bodyWaterPct = null) => {
        const clamped = Math.round(Math.max(45, Math.min(200, kg)) * 10) / 10;
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const ema = Math.round((state.weightEma * 0.75 + clamped * 0.25) * 10) / 10;

        const cleanBf =
          bodyFatPct !== null && bodyFatPct !== undefined && bodyFatPct > 0
            ? Math.round(bodyFatPct * 10) / 10
            : existing.bodyFatPct ?? state.bodyFatPct;
        const cleanBw =
          bodyWaterPct !== null && bodyWaterPct !== undefined && bodyWaterPct > 0
            ? Math.round(bodyWaterPct * 10) / 10
            : existing.bodyWaterPct ?? state.bodyWaterPct;

        set({
          rawWeight: clamped,
          weightEma: ema,
          bodyFatPct: cleanBf,
          bodyWaterPct: cleanBw,
          earnedXp: state.earnedXp + (existing.scaleWeightKg === null ? 15 : 0),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              scaleWeightKg: clamped,
              bodyFatPct: cleanBf,
              bodyWaterPct: cleanBw,
            },
          },
        });

        fireWebhookIfConfigured(
          state.webhookUrl,
          "log_weight",
          { date: key, raw: clamped, ema },
          get().syncWithLedger
        );

        return { ema, raw: clamped };
      },

      setSamsungSteps: (steps, allowLower = false) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const nextSteps = allowLower
          ? Math.max(0, Math.round(steps))
          : Math.max(existing.samsungSteps ?? 0, Math.round(steps));

        let xpAwarded = 0;
        let verticalGainM = 0;
        let steps10kAwarded = existing.steps10kAwarded ?? false;
        let steps15kAwarded = existing.steps15kAwarded ?? false;

        if (nextSteps >= 10000 && !steps10kAwarded) {
          steps10kAwarded = true;
          xpAwarded += 30;
          verticalGainM += 45;
        }
        if (nextSteps >= 15000 && !steps15kAwarded) {
          steps15kAwarded = true;
          xpAwarded += 15;
          verticalGainM += 35;
        }

        set({
          earnedXp: state.earnedXp + xpAwarded,
          kiliMeters: state.kiliMeters + verticalGainM,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              samsungSteps: nextSteps,
              pendingStepReset: allowLower ? true : existing.pendingStepReset,
              steps10kAwarded,
              steps15kAwarded,
            },
          },
        });

        fireWebhookIfConfigured(
          state.webhookUrl,
          "set_samsung_steps",
          { date: key, samsungSteps: nextSteps },
          get().syncWithLedger
        );

        return { xpAwarded, verticalGainM };
      },

      setWebhookUrl: (webhookUrl) => set({ webhookUrl }),

      syncWithLedger: async () => {
        const state = get();
        const url = state.webhookUrl.trim();
        if (!url) {
          return { ok: false, message: "Paste your MONARCH_LEDGER Apps Script Web App URL first." };
        }
        if (typeof window === "undefined") {
          return { ok: false, message: "Sync runs in browser only." };
        }

        const todayKey = getTodayKey();
        const datesToPush = Array.from(new Set([...state.pendingSyncDates, todayKey]));
        const pushDays = datesToPush.map((dt) => {
          const day = state.days[dt] ?? createEmptyDay(dt);
          const totals = getDailyTotals(day);
          return {
            date: dt,
            rawWeightKg: day.scaleWeightKg,
            weightEmaKg: state.weightEma,
            bodyFatPct: day.bodyFatPct,
            bodyWaterPct: day.bodyWaterPct,
            samsungSteps: day.samsungSteps ?? 0,
            resetSteps: Boolean(day.pendingStepReset),
            kcalTotal: totals.kcal,
            proteinG: totals.proteinG,
            dinnerSkipped: day.dinnerSkipped,
            workoutsCount:
              day.workouts.length + (day.survivalFloorCleared ? 1 : 0),
            benchBestE1rmKg: state.benchBest.e1rm,
            kiliTotalM: state.kiliMeters,
          };
        });

        try {
          // text/plain avoids CORS OPTIONS preflight against Google Apps Script Web Apps
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              source: "monarch_pwa",
              reason: "two_way_sync",
              days: pushDays,
            }),
            redirect: "follow",
          });
          if (!res.ok) {
            return { ok: false, message: `HTTP ${res.status} from Apps Script.` };
          }
          const json = (await res.json()) as {
            ok?: boolean;
            syncedAt?: string;
            todayMetrics?: {
              date: string;
              rawWeightKg?: number | null;
              weightEmaKg?: number | null;
              bodyFatPct?: number | null;
              bodyWaterPct?: number | null;
              samsungSteps?: number;
              hcStepsLive?: boolean;
            } | null;
            recentMetrics?: Array<{
              date: string;
              rawWeightKg?: number | null;
              weightEmaKg?: number | null;
              bodyFatPct?: number | null;
              bodyWaterPct?: number | null;
              samsungSteps?: number;
              hcStepsLive?: boolean;
            }>;
            coachOverrides?: {
              coach_banner?: string;
              step_target?: number;
            };
          };

          if (!json?.ok) {
            return { ok: false, message: "Apps Script returned error response." };
          }

          const latest = get();
          const mergedDays = { ...latest.days };
          let bonusXp = 0;
          let bonusKili = 0;
          let nextRawWeight = latest.rawWeight;
          let nextEmaWeight = latest.weightEma;
          let nextBf = latest.bodyFatPct;
          let nextBw = latest.bodyWaterPct;

          const incoming = [
            ...(json.recentMetrics ?? []),
            ...(json.todayMetrics ? [json.todayMetrics] : []),
          ];

          for (const m of incoming) {
            if (!m || !m.date) continue;
            const cur = mergedDays[m.date] ?? createEmptyDay(m.date);
            const isLive = Boolean(m.hcStepsLive);
            const steps = isLive || cur.pendingStepReset
              ? Math.max(0, m.samsungSteps ?? 0)
              : Math.max(cur.samsungSteps ?? 0, m.samsungSteps ?? 0);
            let s10 = cur.steps10kAwarded ?? false;
            let s15 = cur.steps15kAwarded ?? false;
            if (steps >= 10000 && !s10) {
              s10 = true;
              bonusXp += 30;
              bonusKili += 45;
            }
            if (steps >= 15000 && !s15) {
              s15 = true;
              bonusXp += 15;
              bonusKili += 35;
            }

            const rawKg = m.rawWeightKg ?? cur.scaleWeightKg ?? null;
            const bf = m.bodyFatPct ?? cur.bodyFatPct ?? null;
            const bw = m.bodyWaterPct ?? cur.bodyWaterPct ?? null;

            mergedDays[m.date] = {
              ...cur,
              samsungSteps: steps,
              hcStepsLive: isLive,
              pendingStepReset: false,
              steps10kAwarded: s10,
              steps15kAwarded: s15,
              scaleWeightKg: rawKg,
              bodyFatPct: bf,
              bodyWaterPct: bw,
            };

            if (m.date === todayKey || (rawKg !== null && m.date >= (json.todayMetrics?.date || todayKey))) {
              if (rawKg !== null) {
                nextRawWeight = rawKg;
                if (m.weightEmaKg && m.weightEmaKg > 20) {
                  nextEmaWeight = m.weightEmaKg;
                }
              }
              if (bf !== null) nextBf = bf;
              if (bw !== null) nextBw = bw;
            }
          }

          const coachBanner = String(json.coachOverrides?.coach_banner || "");
          const stepTarget =
            Number(json.coachOverrides?.step_target) > 0
              ? Number(json.coachOverrides?.step_target)
              : latest.stepTarget;

          set({
            days: mergedDays,
            earnedXp: latest.earnedXp + bonusXp,
            kiliMeters: latest.kiliMeters + bonusKili,
            rawWeight: nextRawWeight,
            weightEma: nextEmaWeight,
            bodyFatPct: nextBf,
            bodyWaterPct: nextBw,
            coachBanner,
            stepTarget,
            pendingSyncDates: [],
            lastSyncedAt: json.syncedAt || new Date().toISOString(),
          });

          return { ok: true, message: "2-Way Sync complete." };
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : "Network sync failed (queued offline).",
          };
        }
      },

      exportJson: () => {
        const s = get();
        const snapshot: MonarchPersistedState = {
          context: s.context,
          split: s.split,
          arena: s.arena,
          gateRank: s.gateRank,
          lowMana: s.lowMana,
          debloatMode: s.debloatMode,
          legacyXp: s.legacyXp,
          legacyWorkouts: s.legacyWorkouts,
          earnedXp: s.earnedXp,
          totalPrs: s.totalPrs,
          weightEma: s.weightEma,
          rawWeight: s.rawWeight,
          bodyFatPct: s.bodyFatPct,
          bodyWaterPct: s.bodyWaterPct,
          stepTarget: s.stepTarget,
          coachBanner: s.coachBanner,
          ledgerSheetId: s.ledgerSheetId,
          lastSyncedAt: s.lastSyncedAt,
          pendingSyncDates: s.pendingSyncDates,
          benchBest: s.benchBest,
          kiliMeters: s.kiliMeters,
          lateNightsSaved: s.lateNightsSaved,
          webhookUrl: s.webhookUrl,
          swappedExercises: s.swappedExercises,
          activeSession: s.activeSession,
          days: s.days,
        };
        return JSON.stringify(snapshot, null, 2);
      },

      importJson: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<MonarchPersistedState>;
          if (!parsed || typeof parsed !== "object" || !parsed.days) {
            return { ok: false, error: "Invalid Monarch JSON payload." };
          }
          set({
            ...INITIAL_PERSISTED_STATE,
            ...parsed,
          });
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : "Failed to parse JSON.",
          };
        }
      },
    }),
    {
      name: "monarch-v2-state",
      storage: createJSONStorage(() => monarchIdbStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.webhookUrl?.trim()) {
          state.setWebhookUrl(DEFAULT_WEBHOOK_URL);
        }
        state?.setHasHydrated(true);
      },
      partialize: (state): MonarchPersistedState => ({
        context: state.context,
        split: state.split,
        arena: state.arena,
        gateRank: state.gateRank,
        lowMana: state.lowMana,
        debloatMode: state.debloatMode,
        legacyXp: state.legacyXp,
        legacyWorkouts: state.legacyWorkouts,
        earnedXp: state.earnedXp,
        totalPrs: state.totalPrs,
        weightEma: state.weightEma,
        rawWeight: state.rawWeight,
        bodyFatPct: state.bodyFatPct,
        bodyWaterPct: state.bodyWaterPct,
        stepTarget: state.stepTarget,
        coachBanner: state.coachBanner,
        ledgerSheetId: state.ledgerSheetId,
        lastSyncedAt: state.lastSyncedAt,
        pendingSyncDates: state.pendingSyncDates,
        benchBest: state.benchBest,
        kiliMeters: state.kiliMeters,
        lateNightsSaved: state.lateNightsSaved,
        webhookUrl: state.webhookUrl,
        swappedExercises: state.swappedExercises,
        activeSession: state.activeSession,
        days: state.days,
      }),
    }
  )
);
