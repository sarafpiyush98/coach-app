"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  autoDetectContext,
  CONTEXTS,
  CORE_SPLIT_ORDER,
  DEFAULT_WEEKLY_MEAL_PLAN,
  FOOD_PRESETS,
  GATE_RANKS,
  normalizeGateRankInput,
  WEIGHT_RAID_BOSSES,
  type ArenaId,
  type ContextId,
  type DayMealPlan,
  type GateRankId,
  type MealSlot,
  type SplitId,
  type WeekdayKey,
} from "./monarch-catalog";
import { getHunterRank, type HunterRank } from "./ranks";
import { calculateStats, type PlayerStats } from "./stats";
import {
  DEFAULT_EMA_ALPHA,
  localDateKey,
  recomputeWeightTrend,
  shiftDateKey,
} from "./weight-engine";

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
  presetId?: string;
  timeIso: string;
  label: string;
  kcal: number;
  proteinG: number;
  multiplier: number;
  slot?: MealSlot;
  isAbsRaid?: boolean;
  isSeal?: boolean;
  spot?: string;
}

export interface SavedFoodItem {
  id: string;
  label: string;
  spot?: string;
  kcal: number;
  proteinG: number;
  defaultSlot?: MealSlot;
  createdAtIso: string;
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
  | "zone2_jog"
  | "brisk_walk"
  | "pack_incline"
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

export type BookStatus = "reading" | "finished" | "paused";

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  currentPage: number;
  totalPages?: number;
  status: BookStatus;
  startedAtIso: string;
  finishedAtIso?: string;
}

export interface ReadingLogEntry {
  id: string;
  timeIso: string;
  bookId: string;
  bookTitle: string;
  fromPage: number;
  toPage: number;
  pagesDelta: number;
}

export interface DayRecord {
  date: string;
  foods: FoodLogEntry[];
  workouts: WorkoutLogSummary[];
  movements: MovementLogEntry[];
  readingLogs?: ReadingLogEntry[];
  readingFloorXpAwarded?: boolean;
  dinnerSkipped: boolean;
  dinnerOutMode?: boolean;
  restDay?: boolean;
  earlySealXpAwarded: boolean;
  survivalFloorCleared: boolean;
  gluttonyRaidAwarded: boolean;
  activeFlexKcal: number;
  scaleWeightKg: number | null;
  bodyFatPct: number | null;
  bodyWaterPct: number | null;
  sleepHours?: number | null;
  swimSportMin?: number;
  waterDone?: boolean;
  electrolytesDone?: boolean;
  creatineDone?: boolean;
  ritualXpAwarded?: {
    water?: boolean;
    electrolytes?: boolean;
    creatine?: boolean;
  };
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

export interface ExerciseProgress {
  exerciseId: string;
  lastWeightKg: number;
  lastReps: number;
  allSetsAtCap?: boolean;
  bestWeightKg: number;
  bestReps: number;
  bestE1rm: number;
  lastDate: string;
  sessionsCount: number;
}

export interface ActiveSetDraft {
  weightKg: number;
  reps: number;
  done: boolean;
}

export interface ActiveWorkoutSession {
  date: string;
  split: SplitId;
  arena: ArenaId;
  gateRank: GateRankId;
  completedSets: Record<string, boolean[]>;
  draftLoads?: Record<string, { weightKg: number; reps: number }>;
  setLogs?: Record<string, ActiveSetDraft[]>;
  benchWeight: number;
  benchReps: number;
  lastSetAtMs: number | null;
  activeRestTargetSec?: number | null;
  lastExerciseId?: string | null;
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
  bestWeightEma: number;
  slainBossIds: string[];
  bodyFatPct: number | null;
  bodyWaterPct: number | null;
  kcalTarget: number;
  proteinTargetG: number;
  stepTarget: number;
  coachBanner: string;
  ledgerSheetId: string;
  syncToken: string;
  lastSyncedAt: string | null;
  lastAutoContextDate: string | null;
  pendingSyncDates: string[];
  benchBest: BenchBest;
  exerciseLogs: Record<string, ExerciseProgress>;
  kiliMeters: number;
  kiliChecklist: Record<string, boolean>;
  lastDeloadDate: string | null;
  lateNightsSaved: number;
  bestActiveStreak: number;
  bestFastingStreak: number;
  bestCombo: number;
  webhookUrl: string;
  swappedExercises: Record<string, boolean>;
  activeSession: ActiveWorkoutSession | null;
  savedFoods: SavedFoodItem[];
  weeklyMealPlan: Record<WeekdayKey, DayMealPlan>;
  weeklyMealPlanCustomized: boolean;
  mealPlanVersion?: number;
  books: BookItem[];
  activeBookId: string | null;
  readingMinPages: number;
  days: Record<string, DayRecord>;
}

export interface MonarchActions {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setContext: (c: ContextId) => void;
  maybeAutoDetectContext: () => void;
  setSplit: (s: SplitId) => void;
  setArena: (a: ArenaId) => void;
  setGateRank: (g: GateRankId) => void;
  toggleLowMana: () => void;
  toggleDebloat: () => void;
  toggleExerciseSwap: (exerciseId: string) => void;
  syncActiveSession: (patch: Partial<ActiveWorkoutSession> & { reset?: boolean }) => void;
  setActiveDraftLoad: (exKey: string, weightKg: number, reps: number) => void;
  setActiveSetLog: (
    exKey: string,
    setIdx: number,
    totalSetsForEx: number,
    weightKg: number,
    reps: number
  ) => void;
  toggleActiveSet: (meta: {
    split: SplitId;
    arena: ArenaId;
    gateRank: GateRankId;
    exId: string;
    setIdx: number;
    totalSetsForEx: number;
    restSec?: number;
  }) => { turnedOn: boolean };
  clearActiveRestTimer: () => void;
  discardActiveSession: () => void;
  toggleRestDay: () => { isRest: boolean };
  toggleDailyRitual: (kind: "water" | "electrolytes" | "creatine") => {
    done: boolean;
    xpAwarded: number;
  };
  toggleKiliCheck: (id: string) => void;
  markDeloadWeek: () => void;
  clearSurvivalFloor: () => { xpAwarded: number; alreadyCleared: boolean };
  completeGateWorkout: (input: {
    split: SplitId;
    arena: ArenaId;
    gateRank: GateRankId;
    setsCompleted: number;
    benchWeightKg?: number;
    benchReps?: number;
    loggedExercises?: Array<{
      key: string;
      weightKg: number;
      reps: number;
      isBench?: boolean;
      allSetsAtCap?: boolean;
    }>;
    verticalGainM?: number;
  }) => {
    xpAwarded: number;
    isPr: boolean;
    prsHit: number;
    newE1rm?: number;
    nextSplit: SplitId;
  };
  logQuickMovement: (kind: MovementKind) => { xpAwarded: number; verticalGainM: number };
  logFoodPreset: (presetId: string, multiplier?: number, slot?: MealSlot) => {
    xpAwarded: number;
    isAbsRaid: boolean;
    label: string;
  };
  logCustomFood: (label: string, kcal: number, proteinG: number, slot?: MealSlot) => { xpAwarded: number };
  logFoodBatch: (
    items: Array<{
      presetId?: string;
      savedFoodId?: string;
      label: string;
      kcal: number;
      proteinG: number;
      multiplier: number;
      spot?: string;
      isAbsRaid?: boolean;
      isSeal?: boolean;
    }>,
    slot?: MealSlot
  ) => {
    xpAwarded: number;
    count: number;
    totalKcal: number;
    totalProteinG: number;
    hasAbsRaid: boolean;
  };
  saveCustomFood: (item: {
    label: string;
    spot?: string;
    kcal: number;
    proteinG: number;
    defaultSlot?: MealSlot;
  }) => SavedFoodItem;
  deleteSavedFood: (id: string) => void;
  setTodayDinnerOutMode: (enabled: boolean) => void;
  updateWeeklyPlanDay: (day: WeekdayKey, patch: Partial<DayMealPlan>) => void;
  resetWeeklyMealPlan: () => void;
  addBook: (input: {
    title: string;
    author?: string;
    currentPage?: number;
    totalPages?: number;
  }) => BookItem;
  setActiveBook: (bookId: string) => void;
  updateBookMeta: (
    bookId: string,
    patch: { title?: string; author?: string; totalPages?: number; status?: BookStatus }
  ) => void;
  deleteBook: (bookId: string) => void;
  logBookPage: (
    bookId: string,
    newPage: number
  ) => {
    pagesDelta: number;
    todayPages: number;
    floorJustCleared: boolean;
    xpAwarded: number;
    finishedBook: boolean;
  };
  logBookPagesDelta: (
    bookId: string,
    deltaPages: number
  ) => {
    pagesDelta: number;
    todayPages: number;
    floorJustCleared: boolean;
    xpAwarded: number;
    finishedBook: boolean;
  };
  removeReadingEntry: (dateKey: string, entryId: string) => void;
  removeFoodEntry: (dateKey: string, entryId: string) => void;
  lockDinnerSkip: () => { xpAwarded: number; alreadyLocked: boolean };
  logScaleWeight: (
    kg: number,
    bodyFatPct?: number | null,
    bodyWaterPct?: number | null
  ) => { ema: number; raw: number };
  setSamsungSteps: (steps: number, allowLower?: boolean) => { xpAwarded: number; verticalGainM: number };
  setWebhookUrl: (url: string) => void;
  setLedgerSheetId: (id: string) => void;
  setSyncToken: (token: string) => void;
  setTargets: (patch: {
    kcalTarget?: number;
    proteinTargetG?: number;
    stepTarget?: number;
    readingMinPages?: number;
  }) => void;
  syncWithLedger: () => Promise<{ ok: boolean; message: string }>;
  backupSnapshotToLedger: () => Promise<{ ok: boolean; message: string }>;
  restoreSnapshotFromLedger: () => Promise<{ ok: boolean; message: string }>;
  exportJson: () => string;
  importJson: (raw: string) => { ok: boolean; error?: string };
}

export type MonarchStore = MonarchPersistedState & MonarchActions;

// ============================================================
// Pure Helpers
// ============================================================

export function getTodayKey(date: Date = new Date()): string {
  return localDateKey(date);
}

export function createEmptyDay(date: string): DayRecord {
  return {
    date,
    foods: [],
    workouts: [],
    movements: [],
    readingLogs: [],
    readingFloorXpAwarded: false,
    dinnerSkipped: false,
    dinnerOutMode: false,
    restDay: false,
    earlySealXpAwarded: false,
    survivalFloorCleared: false,
    gluttonyRaidAwarded: false,
    activeFlexKcal: 0,
    scaleWeightKg: null,
    bodyFatPct: null,
    bodyWaterPct: null,
    sleepHours: null,
    waterDone: false,
    electrolytesDone: false,
    creatineDone: false,
    ritualXpAwarded: {},
    samsungSteps: 0,
    steps10kAwarded: false,
    steps15kAwarded: false,
  };
}

export function epley1Rm(weightKg: number, reps: number): number {
  if (reps <= 1) return Math.round(weightKg * 10) / 10;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function isReliableBenchPrSet(reps: number): boolean {
  return reps >= 1 && reps <= 10;
}

export function normalizeSplitId(raw: string | undefined): SplitId {
  if (
    raw === "upper_a" ||
    raw === "lower_a" ||
    raw === "upper_b" ||
    raw === "lower_b" ||
    raw === "ul_combo_a" ||
    raw === "ul_combo_b" ||
    raw === "full_body_plus" ||
    raw === "cardio_pool"
  ) {
    return raw;
  }
  if (raw === "push") return "upper_a";
  if (raw === "pull") return "upper_b";
  if (raw === "legs") return "lower_a";
  if (raw === "pool_steps") return "cardio_pool";
  return "upper_a";
}

export function normalizeGateRankId(raw: string | undefined): GateRankId {
  return normalizeGateRankInput(raw);
}

export function syncBossSlainIds(existingIds: string[], weightEma: number): string[] {
  const set = new Set(existingIds);
  for (const boss of WEIGHT_RAID_BOSSES) {
    if (weightEma <= boss.targetKg) {
      set.add(boss.id);
    }
  }
  return Array.from(set);
}

export interface WeeklyTrainingSummary {
  completedThisWeek: Partial<Record<SplitId, number>>;
  coreDoneCount: number;
  weeklyMinTarget: number;
  bonusDoneCount: number;
  totalSessionsThisWeek: number;
  nextCoreSplit: SplitId;
}

export function computeWeeklyTraining(
  days: Record<string, DayRecord>,
  today: Date = new Date()
): WeeklyTrainingSummary {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = localToday.getDay(); // 0=Sun..6=Sat
  const offsetFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(localToday);
  monday.setDate(localToday.getDate() - offsetFromMon);

  const completedThisWeek: Partial<Record<SplitId, number>> = {};
  let totalSessionsThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const rec = days[getTodayKey(d)];
    if (!rec) continue;
    for (const w of rec.workouts ?? []) {
      const sp = normalizeSplitId(w.split as unknown as string);
      if (sp === "ul_combo_a") {
        completedThisWeek.ul_combo_a = (completedThisWeek.ul_combo_a ?? 0) + 1;
        completedThisWeek.upper_a = (completedThisWeek.upper_a ?? 0) + 1;
        completedThisWeek.lower_a = (completedThisWeek.lower_a ?? 0) + 1;
      } else if (sp === "ul_combo_b") {
        completedThisWeek.ul_combo_b = (completedThisWeek.ul_combo_b ?? 0) + 1;
        completedThisWeek.upper_b = (completedThisWeek.upper_b ?? 0) + 1;
        completedThisWeek.lower_b = (completedThisWeek.lower_b ?? 0) + 1;
      } else {
        completedThisWeek[sp] = (completedThisWeek[sp] ?? 0) + 1;
      }
      totalSessionsThisWeek += 1;
    }
  }

  const coreDoneCount = CORE_SPLIT_ORDER.filter(
    (sp) => (completedThisWeek[sp] ?? 0) > 0
  ).length;
  const bonusDoneCount =
    (completedThisWeek.full_body_plus ?? 0) +
    (completedThisWeek.cardio_pool ?? 0);

  let lastCore: SplitId | null = null;
  for (let i = 0; i < 21 && !lastCore; i++) {
    const d = new Date(localToday);
    d.setDate(localToday.getDate() - i);
    const rec = days[getTodayKey(d)];
    const workouts = rec?.workouts ?? [];
    for (let j = workouts.length - 1; j >= 0; j--) {
      const norm = normalizeSplitId(workouts[j].split as unknown as string);
      const effCore: SplitId | null =
        norm === "ul_combo_a"
          ? "lower_a"
          : norm === "ul_combo_b"
            ? "lower_b"
            : CORE_SPLIT_ORDER.includes(norm)
              ? norm
              : null;
      if (effCore) {
        lastCore = effCore;
        break;
      }
    }
  }

  let nextCoreSplit: SplitId = "upper_a";
  if (lastCore) {
    const idx = CORE_SPLIT_ORDER.indexOf(lastCore);
    const rotated = CORE_SPLIT_ORDER[(idx + 1) % CORE_SPLIT_ORDER.length];
    if ((completedThisWeek[rotated] ?? 0) > 0 && coreDoneCount < 4) {
      nextCoreSplit =
        CORE_SPLIT_ORDER.find((sp) => (completedThisWeek[sp] ?? 0) === 0) ??
        rotated;
    } else {
      nextCoreSplit = rotated;
    }
  }

  return {
    completedThisWeek,
    coreDoneCount,
    weeklyMinTarget: 3,
    bonusDoneCount,
    totalSessionsThisWeek,
    nextCoreSplit,
  };
}

/**
 * Calibrated v2 XP curve: 90 + (L - 1) * 22.
 * At legacyXp = 4850, Piyush starts awakened at Level 18 (B-Rank).
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

export function getDailyReadingPages(day: DayRecord | undefined): number {
  return Math.max(
    0,
    (day?.readingLogs ?? []).reduce((sum, e) => sum + e.pagesDelta, 0)
  );
}

export function isRealActivityDay(day: DayRecord | undefined, readingMin = 5): boolean {
  if (!day) return false;
  const kcalLogged = (day.foods ?? []).reduce((s, f) => s + (f.kcal || 0), 0);
  return (
    day.survivalFloorCleared ||
    day.workouts.length > 0 ||
    day.movements.length > 0 ||
    kcalLogged >= 400 ||
    day.dinnerSkipped ||
    (day.samsungSteps ?? 0) >= 8000 ||
    getDailyReadingPages(day) >= readingMin
  );
}

export function isDayActive(day: DayRecord | undefined, readingMin = 5): boolean {
  if (!day) return false;
  return isRealActivityDay(day, readingMin) || Boolean(day.restDay);
}

export function getDailyTotals(
  day: DayRecord | undefined,
  kcalTarget = 1800,
  proteinTargetG = 165
) {
  const foods = day?.foods ?? [];
  const kcal = foods.reduce((acc, f) => acc + f.kcal, 0);
  const proteinG = foods.reduce((acc, f) => acc + f.proteinG, 0);
  const activeFlexKcal = day?.activeFlexKcal ?? 0;
  const targetKcal = Math.max(1450, kcalTarget) + activeFlexKcal;
  const targetProteinG = Math.max(100, proteinTargetG);
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

export function computeReadingStreak(
  days: Record<string, DayRecord>,
  minPages = 5,
  today: Date = new Date()
): number {
  let streak = 0;
  const todayDone = getDailyReadingPages(days[getTodayKey(today)]) >= minPages;
  const startOffset = todayDone ? 0 : 1;
  for (let i = startOffset; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const rec = days[getTodayKey(d)];
    if (getDailyReadingPages(rec) >= minPages) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
  let shieldAvailable = true;
  let igrisShieldedThisWeek = false;
  let consecutiveRestOnly = 0;

  const todayKey = getTodayKey(today);
  const todayDone = isDayActive(days[todayKey]);
  const startOffset = todayDone ? 0 : 1;

  for (let i = startOffset; i < 90; i++) {
    const key = shiftDateKey(todayKey, -i);
    const rec = days[key];
    if (isRealActivityDay(rec)) {
      activeStreak++;
      consecutiveRestOnly = 0;
    } else if (rec?.restDay && consecutiveRestOnly < 2) {
      activeStreak++;
      consecutiveRestOnly++;
    } else if (rec?.restDay) {
      break;
    } else if (i < 7 && shieldAvailable) {
      // Peek ahead 1 day so Igris Shield works in the morning before today is logged
      const nextBackKey = shiftDateKey(todayKey, -(i + 1));
      const nextBackRec = days[nextBackKey];
      if (activeStreak > 0 || isRealActivityDay(nextBackRec)) {
        shieldAvailable = false;
        igrisShieldedThisWeek = true;
        consecutiveRestOnly = 0;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // True consecutive dinner-skipped / OMAD-sealed fasting streak
  let fastingStreak = 0;
  const fastStart = days[todayKey]?.dinnerSkipped ? 0 : 1;
  for (let i = fastStart; i < 90; i++) {
    const key = shiftDateKey(todayKey, -i);
    if (days[key]?.dinnerSkipped) {
      fastingStreak++;
    } else {
      break;
    }
  }

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

export function isBellionUnlocked(state: Pick<MonarchPersistedState, "legacyXp" | "earnedXp" | "weightEma">): boolean {
  const lvl = levelFromMonarchXp(state.legacyXp + state.earnedXp).level;
  return lvl >= 40 || state.weightEma < 100;
}

export function applyMonarchXpBonus(
  baseXp: number,
  state: Pick<MonarchPersistedState, "days" | "legacyXp" | "earnedXp" | "weightEma">,
  opts?: { isPr?: boolean }
): number {
  const streak = computeStreakAndCombo(state.days);
  const bellionMult = opts?.isPr && isBellionUnlocked(state) ? 2 : 1;
  return Math.round(baseXp * streak.comboMultiplier * bellionMult);
}

export function computeConsecutiveGoodWeeks(
  days: Record<string, DayRecord>,
  today: Date = new Date()
): number {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = localToday.getDay();
  const offsetFromMon = dow === 0 ? 6 : dow - 1;
  const currentMonday = new Date(localToday);
  currentMonday.setDate(localToday.getDate() - offsetFromMon);

  let streakWeeks = 0;
  for (let w = 0; w < 12; w++) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() - w * 7);
    let scoreDays = 0;
    for (let d = 0; d < 7; d++) {
      const cur = new Date(mon);
      cur.setDate(mon.getDate() + d);
      const rec = days[getTodayKey(cur)];
      if (rec && (rec.workouts.length > 0 || rec.movements.length > 0 || rec.survivalFloorCleared)) {
        scoreDays++;
      }
    }
    if (scoreDays >= 3) {
      streakWeeks++;
    } else if (w > 0) {
      break;
    }
  }
  return streakWeeks;
}

export function computeWeeklyAvgKcal(
  days: Record<string, DayRecord>,
  today: Date = new Date()
): number | null {
  const todayKey = getTodayKey(today);
  const logged: number[] = [];
  for (let i = 0; i < 7; i++) {
    const rec = days[shiftDateKey(todayKey, -i)];
    const sum = (rec?.foods ?? []).reduce((a, f) => a + f.kcal, 0);
    if (sum >= 800) logged.push(sum);
  }
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((a, b) => a + b, 0) / logged.length);
}

export function computeWeeklyKiliStats(
  days: Record<string, DayRecord>,
  today: Date = new Date()
): {
  zone2MinutesThisWeek: number;
  zone2TargetMin: number;
  packInclineCountThisWeek: number;
} {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = localToday.getDay();
  const offsetFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(localToday);
  monday.setDate(localToday.getDate() - offsetFromMon);

  let zone2MinutesThisWeek = 0;
  let packInclineCountThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const rec = days[getTodayKey(d)];
    if (!rec) continue;
    for (const mv of rec.movements ?? []) {
      const preset = MOVEMENT_PRESETS[mv.kind];
      zone2MinutesThisWeek += preset?.zone2Min ?? 0;
      if (mv.kind === "pack_incline") {
        packInclineCountThisWeek += 1;
      }
    }
    for (const wo of rec.workouts ?? []) {
      if (wo.split === "cardio_pool") {
        zone2MinutesThisWeek += 30;
      }
    }
    if ((rec.swimSportMin ?? 0) > 0 && !(rec.movements ?? []).some((m) => m.kind === "cg_swim")) {
      zone2MinutesThisWeek += rec.swimSportMin ?? 0;
    }
  }

  return {
    zone2MinutesThisWeek,
    zone2TargetMin: 150,
    packInclineCountThisWeek,
  };
}

export function computeDeloadAdvisory(
  days: Record<string, DayRecord>,
  lastDeloadDate: string | null,
  today: Date = new Date()
): { recommended: boolean; sessionsSinceDeload: number; reason: string | null } {
  const todayKey = getTodayKey(today);
  const cutoff = lastDeloadDate || shiftDateKey(todayKey, -42);
  let sessionsSinceDeload = 0;

  for (const [dt, rec] of Object.entries(days)) {
    if (dt < cutoff || dt > todayKey) continue;
    for (const wo of rec.workouts ?? []) {
      if (wo.split !== "cardio_pool") {
        sessionsSinceDeload += wo.split === "ul_combo_a" || wo.split === "ul_combo_b" ? 2 : 1;
      }
    }
  }

  if (sessionsSinceDeload >= 18) {
    return {
      recommended: true,
      sessionsSinceDeload,
      reason: `${sessionsSinceDeload} hard lift sessions since last deload - run 1 week at RIR 2-3 (Low Mana) to clear joint/CNS fatigue.`,
    };
  }
  return {
    recommended: false,
    sessionsSinceDeload,
    reason: null,
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
    allDays.reduce(
      (s, d) =>
        s +
        d.movements.length +
        (d.dinnerSkipped ? 1 : 0) +
        (getDailyReadingPages(d) >= (state.readingMinPages || 5) ? 1 : 0),
      0
    );
  const { activeStreak, fastingStreak, comboDay } = computeStreakAndCombo(state.days);
  const lvl = levelFromMonarchXp(state.legacyXp + state.earnedXp).level;
  const goodWeeks = computeConsecutiveGoodWeeks(state.days);

  return calculateStats({
    totalWorkouts,
    totalPrs: state.totalPrs,
    totalCheckins,
    totalMealsLogged,
    bestExerciseStreak: Math.max(state.bestActiveStreak || 14, activeStreak),
    bestLoggingStreak: Math.max(12, activeStreak),
    bestNoLateEatingStreak: Math.max(state.bestFastingStreak || 6, state.lateNightsSaved + fastingStreak),
    bestCombo: Math.max(state.bestCombo || 14, comboDay),
    consecutiveGoodWeeks: goodWeeks,
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
  const totals = getDailyTotals(day, state.kcalTarget, state.proteinTargetG);
  const hour = now.getHours();

  if (state.lowMana && !(day?.workouts.length || day?.survivalFloorCleared)) {
    return {
      soldier: "Beru",
      color: "#8b5cf6",
      title: "BERU · LOW-MANA OVERRIDE",
      message: "Short sleep or fatigued? Run 2 recovery sets @ RIR 2-3 (no failure) or clear the 5m Survival Floor.",
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
      message: `${totals.proteinG}g P logged so far. Add 5 PM 2x Whey+Skyr (+70g P) before closing OMAD or you will crash at 11:30 PM.`,
      actionLabel: "LOG 5 PM WHEY+SKYR",
      actionKind: "seal_whey",
    };
  }

  if (hour >= 17 && totals.proteinG >= 100 && !day?.dinnerSkipped) {
    return {
      soldier: "Greed",
      color: "#8b5cf6",
      title: "GREED · OMAD SEAL READY",
      message: `${totals.proteinG}g P already locked. Close OMAD window now (+30 XP) and pocket midnight Swiggy savings.`,
      actionLabel: "CLOSE OMAD",
      actionKind: "lock_skip",
    };
  }

  const streak = computeStreakAndCombo(state.days, now);
  if (!totals.isActive) {
    return {
      soldier: "Igris",
      color: "#3b6cf6",
      title: `IGRIS · DAILY GATE (${streak.comboMultiplier}x COMBO)`,
      message: `One 5m Floor, movement log, or OMAD entry locks today green (${streak.igrisShieldedThisWeek ? "Weekly Igris Shield active" : "Igris Shield ready"}).`,
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

export const DEFAULT_LEDGER_SHEET_ID =
  process.env.NEXT_PUBLIC_MONARCH_SHEET_ID ?? "";
export const DEFAULT_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_MONARCH_WEBHOOK_URL ?? "";

function enqueuePending(existing: string[], dateKey: string): string[] {
  return existing.includes(dateKey) ? existing : [...existing, dateKey];
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightSync: Promise<{ ok: boolean; message: string }> | null = null;

function fireWebhookIfConfigured(
  webhookUrl: string,
  triggerSync?: () => Promise<unknown>
) {
  if (!webhookUrl.trim() || typeof window === "undefined" || !triggerSync) return;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    triggerSync().catch(() => {});
  }, 1200);
}

// ============================================================
// Movement Presets
// ============================================================

export const MOVEMENT_PRESETS: Record<
  MovementKind,
  { label: string; verticalGainM: number; grantsFlex: boolean; xp: number; zone2Min: number }
> = {
  steps_10k: { label: "10k Steps Walk", verticalGainM: 45, grantsFlex: false, xp: 30, zone2Min: 0 },
  steps_15k: { label: "15k Zone-2 Reset", verticalGainM: 80, grantsFlex: false, xp: 45, zone2Min: 30 },
  zone2_jog: { label: "20-30m Zone-2 Jog", verticalGainM: 70, grantsFlex: true, xp: 45, zone2Min: 25 },
  brisk_walk: { label: "20-30m Brisk Walk", verticalGainM: 35, grantsFlex: false, xp: 25, zone2Min: 25 },
  pack_incline: { label: "45m Loaded Pack Incline", verticalGainM: 110, grantsFlex: true, xp: 55, zone2Min: 45 },
  cg_swim: { label: "30m CG Pool (Post-Lift)", verticalGainM: 75, grantsFlex: true, xp: 45, zone2Min: 30 },
  badminton_2h: { label: "Sun 2h Badminton", verticalGainM: 120, grantsFlex: true, xp: 60, zone2Min: 90 },
  sunrise_trek: { label: "Sunrise Hill Trek", verticalGainM: 185, grantsFlex: true, xp: 75, zone2Min: 90 },
};

// ============================================================
// Seed Initial State & Zustand Store
// ============================================================

const INITIAL_PERSISTED_STATE: MonarchPersistedState = {
  context: "cg_home",
  split: "upper_a",
  arena: "cg_gym",
  gateRank: "regular",
  lowMana: false,
  debloatMode: false,
  legacyXp: 4850,
  legacyWorkouts: 82,
  earnedXp: 0,
  totalPrs: 3,
  weightEma: 112.4,
  rawWeight: 112.4,
  bestWeightEma: 112.4,
  slainBossIds: ["gatekeeper"],
  bodyFatPct: null,
  bodyWaterPct: null,
  kcalTarget: 1800,
  proteinTargetG: 165,
  stepTarget: 12000,
  coachBanner: "",
  ledgerSheetId: DEFAULT_LEDGER_SHEET_ID,
  syncToken: "",
  lastSyncedAt: null,
  lastAutoContextDate: null,
  pendingSyncDates: [],
  benchBest: { weightKg: 50, reps: 15, e1rm: 75, updatedAt: "2026-11-26" },
  exerciseLogs: {
    cg_bench_heavy: {
      exerciseId: "cg_bench_heavy",
      lastWeightKg: 50,
      lastReps: 15,
      bestWeightKg: 50,
      bestReps: 15,
      bestE1rm: 75,
      lastDate: "2026-11-26",
      sessionsCount: 1,
    },
  },
  kiliMeters: 1240,
  kiliChecklist: {},
  lastDeloadDate: null,
  lateNightsSaved: 6,
  bestActiveStreak: 14,
  bestFastingStreak: 6,
  bestCombo: 14,
  webhookUrl: DEFAULT_WEBHOOK_URL,
  swappedExercises: {},
  activeSession: null,
  savedFoods: [],
  weeklyMealPlan: DEFAULT_WEEKLY_MEAL_PLAN,
  weeklyMealPlanCustomized: false,
  mealPlanVersion: 3,
  books: [],
  activeBookId: null,
  readingMinPages: 5,
  days: {},
};

function reconcileWeightAndRecords(
  state: Pick<MonarchPersistedState, "days" | "bestWeightEma" | "slainBossIds" | "bestActiveStreak" | "bestFastingStreak" | "bestCombo" | "rawWeight" | "weightEma">
) {
  const trend = recomputeWeightTrend(state.days, 112.4, state.rawWeight || 112.4, DEFAULT_EMA_ALPHA);
  const hasAnyWeighIn = Object.values(state.days).some(
    (d) => typeof d.scaleWeightKg === "number" && d.scaleWeightKg >= 40
  );
  const weightEma = hasAnyWeighIn ? trend.latestEmaKg : state.weightEma;
  const rawWeight = hasAnyWeighIn ? trend.latestRawKg : state.rawWeight;
  const bestWeightEma = Math.min(state.bestWeightEma || weightEma, trend.bestEmaKg, weightEma);
  const slainBossIds = syncBossSlainIds(state.slainBossIds ?? ["gatekeeper"], weightEma);
  const streak = computeStreakAndCombo(state.days);

  return {
    weightEma,
    rawWeight,
    bestWeightEma,
    slainBossIds,
    bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
    bestFastingStreak: Math.max(state.bestFastingStreak || 6, streak.fastingStreak),
    bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
  };
}

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

      maybeAutoDetectContext: () => {
        const key = getTodayKey();
        const s = get();
        if (s.lastAutoContextDate === key) return;
        const detected = autoDetectContext();
        set({
          context: detected,
          lastAutoContextDate: key,
          arena:
            detected === "travel"
              ? "nomad_hotel"
              : s.arena === "nomad_hotel"
                ? CONTEXTS[detected].defaultArena
                : s.arena,
        });
      },

      setSplit: (split) => set({ split }),

      setArena: (arena) => set({ arena }),

      setGateRank: (gateRank) =>
        set({
          gateRank,
          lowMana: gateRank === "low_mana_rir2",
        }),

      toggleLowMana: () =>
        set((s) => {
          const nextLow = !s.lowMana;
          return {
            lowMana: nextLow,
            gateRank: nextLow ? "low_mana_rir2" : "regular",
          };
        }),

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
                draftLoads: {},
                setLogs: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
                activeRestTargetSec: null,
                lastExerciseId: null,
              };
        const { reset, ...rest } = patch;
        void reset;
        set({
          activeSession: {
            ...base,
            ...rest,
            date: key,
          },
        });
      },

      setActiveDraftLoad: (exKey, weightKg, reps) => {
        const key = getTodayKey();
        const s = get();
        const current = s.activeSession;
        const base: ActiveWorkoutSession =
          current && current.date === key
            ? current
            : {
                date: key,
                split: s.split,
                arena: s.arena,
                gateRank: s.gateRank,
                completedSets: {},
                draftLoads: {},
                setLogs: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
                activeRestTargetSec: null,
                lastExerciseId: null,
              };
        const cleanWeight = Math.round(Math.max(0, weightKg) * 10) / 10;
        const cleanReps = Math.max(1, Math.round(reps));
        const isBenchKey = exKey === "cg_bench_heavy" || exKey === "cg_bench";
        set({
          activeSession: {
            ...base,
            benchWeight: isBenchKey ? cleanWeight : base.benchWeight,
            benchReps: isBenchKey ? cleanReps : base.benchReps,
            draftLoads: {
              ...(base.draftLoads ?? {}),
              [exKey]: { weightKg: cleanWeight, reps: cleanReps },
            },
          },
        });
      },

      setActiveSetLog: (exKey, setIdx, totalSetsForEx, weightKg, reps) => {
        const key = getTodayKey();
        const s = get();
        const current = s.activeSession;
        const base: ActiveWorkoutSession =
          current && current.date === key
            ? current
            : {
                date: key,
                split: s.split,
                arena: s.arena,
                gateRank: s.gateRank,
                completedSets: {},
                draftLoads: {},
                setLogs: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
                activeRestTargetSec: null,
                lastExerciseId: null,
              };

        const cleanWeight = Math.round(Math.max(0, weightKg) * 10) / 10;
        const cleanReps = Math.max(1, Math.round(reps));
        const existingLogs = base.setLogs?.[exKey] ?? [];
        const fallbackLoad = base.draftLoads?.[exKey] ?? { weightKg: cleanWeight, reps: cleanReps };
        const padded: ActiveSetDraft[] = Array.from({ length: totalSetsForEx }, (_, i) =>
          existingLogs[i]
            ? { ...existingLogs[i] }
            : { weightKg: fallbackLoad.weightKg, reps: fallbackLoad.reps, done: false }
        );
        padded[setIdx] = { ...padded[setIdx], weightKg: cleanWeight, reps: cleanReps };

        // Cascade Set 1 weight/reps to unedited uncompleted later sets so straight sets take 0 extra taps
        if (setIdx === 0) {
          for (let i = 1; i < padded.length; i++) {
            if (!existingLogs[i] && !padded[i].done) {
              padded[i] = { ...padded[i], weightKg: cleanWeight, reps: cleanReps };
            }
          }
        }

        const isBenchKey = exKey === "cg_bench_heavy" || exKey === "cg_bench";
        set({
          activeSession: {
            ...base,
            benchWeight: isBenchKey ? cleanWeight : base.benchWeight,
            benchReps: isBenchKey ? cleanReps : base.benchReps,
            draftLoads: {
              ...(base.draftLoads ?? {}),
              [exKey]: { weightKg: cleanWeight, reps: cleanReps },
            },
            setLogs: {
              ...(base.setLogs ?? {}),
              [exKey]: padded,
            },
          },
        });
      },

      toggleActiveSet: ({ split, arena, gateRank, exId, setIdx, totalSetsForEx, restSec }) => {
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
                draftLoads: {},
                setLogs: {},
                benchWeight: s.benchBest.weightKg || 55,
                benchReps: 8,
                lastSetAtMs: null,
                activeRestTargetSec: null,
                lastExerciseId: null,
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
            activeRestTargetSec: turnedOn ? (restSec ?? 90) : prev.activeRestTargetSec,
            lastExerciseId: turnedOn ? exId : prev.lastExerciseId,
          },
        });
        return { turnedOn };
      },

      clearActiveRestTimer: () =>
        set((s) => ({
          activeSession: s.activeSession
            ? { ...s.activeSession, lastSetAtMs: null, activeRestTargetSec: null }
            : null,
        })),

      discardActiveSession: () => set({ activeSession: null }),

      toggleRestDay: () => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const nextRest = !Boolean(existing.restDay);
        set({
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: { ...existing, restDay: nextRest },
          },
        });
        return { isRest: nextRest };
      },

      toggleDailyRitual: (kind) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const field =
          kind === "water"
            ? "waterDone"
            : kind === "electrolytes"
              ? "electrolytesDone"
              : "creatineDone";
        const nextDone = !Boolean(existing[field]);
        const prevRitualXp = existing.ritualXpAwarded ?? {};
        const alreadyXp = Boolean(prevRitualXp[kind]);
        const xpAwarded = nextDone && !alreadyXp ? 5 : 0;

        set({
          earnedXp: state.earnedXp + xpAwarded,
          days: {
            ...state.days,
            [key]: {
              ...existing,
              [field]: nextDone,
              ritualXpAwarded: {
                ...prevRitualXp,
                [kind]: alreadyXp || nextDone,
              },
            },
          },
        });
        return { done: nextDone, xpAwarded };
      },

      toggleKiliCheck: (id) =>
        set((s) => ({
          kiliChecklist: {
            ...(s.kiliChecklist ?? {}),
            [id]: !s.kiliChecklist?.[id],
          },
        })),

      markDeloadWeek: () =>
        set({
          lastDeloadDate: getTodayKey(),
          lowMana: true,
          gateRank: "low_mana_rir2",
        }),

      clearSurvivalFloor: () => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        if (existing.survivalFloorCleared || existing.workouts.length > 0) {
          return { xpAwarded: 0, alreadyCleared: true };
        }
        const xpAwarded = applyMonarchXpBonus(35, state);
        const updatedDays = {
          ...state.days,
          [key]: { ...existing, survivalFloorCleared: true, restDay: false },
        };
        const streak = computeStreakAndCombo(updatedDays);
        set({
          earnedXp: state.earnedXp + xpAwarded,
          kiliMeters: state.kiliMeters + 25,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });
        fireWebhookIfConfigured(get().webhookUrl, get().syncWithLedger);
        return { xpAwarded, alreadyCleared: false };
      },

      completeGateWorkout: ({
        split,
        arena,
        gateRank,
        setsCompleted,
        benchWeightKg,
        benchReps,
        loggedExercises,
        verticalGainM,
      }) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const normRank = normalizeGateRankId(gateRank as string);
        const rankDef = GATE_RANKS.find((g) => g.id === normRank) ?? GATE_RANKS[0];
        const isCombo = split === "ul_combo_a" || split === "ul_combo_b";
        let rawXp = isCombo ? Math.round(rankDef.baseXp * 1.5) : rankDef.baseXp;
        let isPr = false;
        let prsHit = 0;
        let newE1rm: number | undefined;
        let nextBench = state.benchBest;
        let nextTotalPrs = state.totalPrs;
        const nextExerciseLogs: Record<string, ExerciseProgress> = {
          ...(state.exerciseLogs ?? {}),
        };

        const entries =
          loggedExercises && loggedExercises.length > 0
            ? loggedExercises
            : benchWeightKg && benchReps && benchWeightKg > 0 && benchReps > 0
              ? [{ key: "cg_bench_heavy", weightKg: benchWeightKg, reps: benchReps, isBench: true }]
              : [];

        let effBenchWeight = benchWeightKg;
        let effBenchReps = benchReps;

        for (const item of entries) {
          if (!item.key || item.weightKg < 0 || item.reps <= 0) continue;
          const prev = nextExerciseLogs[item.key];
          const itemE1rm =
            item.weightKg > 0 ? epley1Rm(item.weightKg, item.reps) : item.reps;
          const isHeavyBenchItem =
            item.key === "cg_bench_heavy" || (Boolean(item.isBench) && item.key !== "cg_bench_vol");

          if (isHeavyBenchItem && item.weightKg > 0) {
            effBenchWeight = item.weightKg;
            effBenchReps = item.reps;
            newE1rm = itemE1rm;
            if (isReliableBenchPrSet(item.reps) && itemE1rm > nextBench.e1rm) {
              isPr = true;
              prsHit += 1;
              rawXp += 75;
              nextTotalPrs += 1;
              nextBench = {
                weightKg: item.weightKg,
                reps: item.reps,
                e1rm: itemE1rm,
                updatedAt: key,
              };
            }
          } else if (prev && itemE1rm > prev.bestE1rm) {
            prsHit += 1;
            rawXp += 25;
            nextTotalPrs += 1;
          }

          const beatBest = !prev || itemE1rm >= prev.bestE1rm;
          nextExerciseLogs[item.key] = {
            exerciseId: item.key,
            lastWeightKg: item.weightKg,
            lastReps: item.reps,
            allSetsAtCap: item.allSetsAtCap,
            bestWeightKg: beatBest ? item.weightKg : prev.bestWeightKg,
            bestReps: beatBest ? item.reps : prev.bestReps,
            bestE1rm: prev ? Math.max(prev.bestE1rm, itemE1rm) : itemE1rm,
            lastDate: key,
            sessionsCount: (prev?.sessionsCount ?? 0) + 1,
          };
        }

        const gainM =
          verticalGainM ??
          (isCombo
            ? 75
            : split === "cardio_pool"
              ? 65
              : normRank === "regular"
                ? 45
                : 30);

        const xpAwarded = applyMonarchXpBonus(rawXp, state, { isPr: isPr || prsHit > 0 });

        const summary: WorkoutLogSummary = {
          id: makeId("wo"),
          timeIso: new Date().toISOString(),
          split,
          arena,
          gateRank: normRank,
          setsCompleted,
          benchWeightKg: effBenchWeight,
          benchReps: effBenchReps,
          e1rm: newE1rm,
          verticalGainM: gainM,
          xpAwarded,
        };

        const updatedDays = {
          ...state.days,
          [key]: {
            ...existing,
            survivalFloorCleared: true,
            restDay: false,
            workouts: [...existing.workouts, summary],
          },
        };
        const weeklyAfter = computeWeeklyTraining(updatedDays);
        const nextSplit = weeklyAfter.nextCoreSplit;
        const streak = computeStreakAndCombo(updatedDays);

        set({
          split: nextSplit,
          earnedXp: state.earnedXp + xpAwarded,
          totalPrs: nextTotalPrs,
          benchBest: nextBench,
          exerciseLogs: nextExerciseLogs,
          kiliMeters: state.kiliMeters + gainM,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          activeSession: null,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return { xpAwarded, isPr, prsHit, newE1rm, nextSplit };
      },

      logQuickMovement: (kind) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const spec = MOVEMENT_PRESETS[kind];
        const xpAwarded = applyMonarchXpBonus(spec.xp, state);

        const entry: MovementLogEntry = {
          id: makeId("mv"),
          timeIso: new Date().toISOString(),
          kind,
          label: spec.label,
          verticalGainM: spec.verticalGainM,
          grantsFlex: spec.grantsFlex,
          xpAwarded,
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

        const updatedDays = {
          ...state.days,
          [key]: {
            ...existing,
            activeFlexKcal: nextFlex,
            samsungSteps: nextSteps,
            steps10kAwarded,
            steps15kAwarded,
            movements: [...existing.movements, entry],
          },
        };
        const streak = computeStreakAndCombo(updatedDays);

        set({
          earnedXp: state.earnedXp + xpAwarded,
          kiliMeters: state.kiliMeters + spec.verticalGainM,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return { xpAwarded, verticalGainM: spec.verticalGainM };
      },

      logFoodPreset: (presetId, multiplier = 1, slot) => {
        const state = get();
        const resolvedId = presetId === "am_eggs_whey" ? "eggs_4_whole" : presetId;
        const preset = FOOD_PRESETS.find((f) => f.id === resolvedId);
        const saved = !preset ? (state.savedFoods ?? []).find((f) => f.id === resolvedId) : undefined;
        if (!preset && !saved) {
          return { xpAwarded: 0, isAbsRaid: false, label: "Unknown" };
        }
        const key = getTodayKey();
        const existing = state.days[key] ?? createEmptyDay(key);

        const baseLabel = preset ? preset.shortLabel : saved!.label;
        const baseKcal = preset ? preset.kcal : saved!.kcal;
        const baseProtein = preset ? preset.proteinG : saved!.proteinG;
        const spot = preset ? preset.spot : saved!.spot;
        const isAbsRaid = preset ? preset.tags.includes("abs_raid") : false;
        const isSeal = preset ? preset.tags.includes("seal") : slot === "seal";

        const entry: FoodLogEntry = {
          id: makeId("fd"),
          presetId: preset ? preset.id : saved!.id,
          timeIso: new Date().toISOString(),
          label: multiplier === 1 ? baseLabel : `${baseLabel} (${multiplier}x)`,
          kcal: Math.round(baseKcal * multiplier),
          proteinG: Math.round(baseProtein * multiplier),
          multiplier,
          slot: slot ?? saved?.defaultSlot,
          isAbsRaid,
          isSeal,
          spot,
        };

        let rawXp = 20;
        let dinnerSkipped = existing.dinnerSkipped;
        let dinnerOutMode = existing.dinnerOutMode ?? false;
        let gluttonyRaidAwarded = existing.gluttonyRaidAwarded;
        let lateNightsSaved = state.lateNightsSaved;

        if (isAbsRaid) {
          if (!dinnerSkipped) {
            dinnerSkipped = true;
            dinnerOutMode = false;
            lateNightsSaved += 1;
          }
          if (!gluttonyRaidAwarded) {
            gluttonyRaidAwarded = true;
            rawXp += 75;
          }
        }

        const xpAwarded = applyMonarchXpBonus(rawXp, state);
        const updatedDays = {
          ...state.days,
          [key]: {
            ...existing,
            dinnerSkipped,
            dinnerOutMode,
            gluttonyRaidAwarded,
            foods: [...existing.foods, entry],
          },
        };
        const streak = computeStreakAndCombo(updatedDays);

        set({
          earnedXp: state.earnedXp + xpAwarded,
          lateNightsSaved,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestFastingStreak: Math.max(state.bestFastingStreak || 6, streak.fastingStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return { xpAwarded, isAbsRaid, label: entry.label };
      },

      logCustomFood: (label, kcal, proteinG, slot) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const xpAwarded = applyMonarchXpBonus(15, state);
        const entry: FoodLogEntry = {
          id: makeId("fd"),
          timeIso: new Date().toISOString(),
          label: label.trim() || "Custom Meal",
          kcal: Math.max(0, Math.round(kcal)),
          proteinG: Math.max(0, Math.round(proteinG)),
          multiplier: 1,
          slot,
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
        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);
        return { xpAwarded };
      },

      logFoodBatch: (items, slot) => {
        if (!items.length) {
          return { xpAwarded: 0, count: 0, totalKcal: 0, totalProteinG: 0, hasAbsRaid: false };
        }
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const nowIso = new Date().toISOString();

        const entries: FoodLogEntry[] = items.map((item) => {
          const mult = Math.max(0.25, item.multiplier || 1);
          const cleanLabel = mult === 1 ? item.label : `${item.label} (${mult}x)`;
          return {
            id: makeId("fd"),
            presetId: item.presetId ?? item.savedFoodId,
            timeIso: nowIso,
            label: cleanLabel,
            kcal: Math.max(0, Math.round(item.kcal * mult)),
            proteinG: Math.max(0, Math.round(item.proteinG * mult)),
            multiplier: mult,
            slot,
            isAbsRaid: Boolean(item.isAbsRaid),
            isSeal: Boolean(item.isSeal) || slot === "seal",
            spot: item.spot,
          };
        });

        const totalKcal = entries.reduce((acc, e) => acc + e.kcal, 0);
        const totalProteinG = entries.reduce((acc, e) => acc + e.proteinG, 0);
        const hasAbsRaid = entries.some((e) => e.isAbsRaid);

        let rawXp = items.length >= 2 ? 25 : 20;
        let dinnerSkipped = existing.dinnerSkipped;
        let dinnerOutMode = existing.dinnerOutMode ?? false;
        let gluttonyRaidAwarded = existing.gluttonyRaidAwarded;
        let lateNightsSaved = state.lateNightsSaved;

        if (hasAbsRaid) {
          if (!dinnerSkipped) {
            dinnerSkipped = true;
            dinnerOutMode = false;
            lateNightsSaved += 1;
          }
          if (!gluttonyRaidAwarded) {
            gluttonyRaidAwarded = true;
            rawXp += 75;
          }
        }

        const xpAwarded = applyMonarchXpBonus(rawXp, state);
        const updatedDays = {
          ...state.days,
          [key]: {
            ...existing,
            dinnerSkipped,
            dinnerOutMode,
            gluttonyRaidAwarded,
            foods: [...existing.foods, ...entries],
          },
        };
        const streak = computeStreakAndCombo(updatedDays);

        set({
          earnedXp: state.earnedXp + xpAwarded,
          lateNightsSaved,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestFastingStreak: Math.max(state.bestFastingStreak || 6, streak.fastingStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return {
          xpAwarded,
          count: entries.length,
          totalKcal,
          totalProteinG,
          hasAbsRaid,
        };
      },

      saveCustomFood: (item) => {
        const state = get();
        const saved: SavedFoodItem = {
          id: makeId("sf"),
          label: item.label.trim() || "Saved Dish",
          spot: item.spot?.trim() || "My Saved Foods",
          kcal: Math.max(0, Math.round(item.kcal)),
          proteinG: Math.max(0, Math.round(item.proteinG)),
          defaultSlot: item.defaultSlot,
          createdAtIso: new Date().toISOString(),
        };
        set({
          savedFoods: [saved, ...(state.savedFoods ?? [])],
        });
        return saved;
      },

      deleteSavedFood: (id) => {
        const state = get();
        set({
          savedFoods: (state.savedFoods ?? []).filter((f) => f.id !== id),
        });
      },

      setTodayDinnerOutMode: (enabled) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        set({
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: {
            ...state.days,
            [key]: {
              ...existing,
              dinnerOutMode: enabled,
              dinnerSkipped: enabled ? false : existing.dinnerSkipped,
            },
          },
        });
        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);
      },

      updateWeeklyPlanDay: (day, patch) => {
        const state = get();
        const basePlan = state.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN;
        const currentDay = basePlan[day] ?? DEFAULT_WEEKLY_MEAL_PLAN[day];
        set({
          mealPlanVersion: 3,
          weeklyMealPlanCustomized: true,
          weeklyMealPlan: {
            ...DEFAULT_WEEKLY_MEAL_PLAN,
            ...basePlan,
            [day]: {
              ...currentDay,
              ...patch,
            },
          },
        });
      },

      resetWeeklyMealPlan: () => {
        set({
          weeklyMealPlan: DEFAULT_WEEKLY_MEAL_PLAN,
          weeklyMealPlanCustomized: false,
          mealPlanVersion: 3,
        });
      },

      addBook: (input) => {
        const state = get();
        const startPage = Math.max(0, Math.round(input.currentPage ?? 0));
        const totalPages =
          input.totalPages && input.totalPages > 0
            ? Math.round(input.totalPages)
            : undefined;
        const item: BookItem = {
          id: makeId("bk"),
          title: input.title.trim() || "Untitled Book",
          author: input.author?.trim() || undefined,
          currentPage: startPage,
          totalPages,
          status:
            totalPages && startPage >= totalPages ? "finished" : "reading",
          startedAtIso: new Date().toISOString(),
          finishedAtIso:
            totalPages && startPage >= totalPages
              ? new Date().toISOString()
              : undefined,
        };
        set({
          books: [item, ...(state.books ?? [])],
          activeBookId: item.id,
        });
        return item;
      },

      setActiveBook: (bookId) => {
        const state = get();
        const books = state.books ?? [];
        if (!books.some((b) => b.id === bookId)) return;
        set({
          activeBookId: bookId,
          books: books.map((b) =>
            b.id === bookId && b.status === "paused"
              ? { ...b, status: "reading" }
              : b
          ),
        });
      },

      updateBookMeta: (bookId, patch) => {
        const state = get();
        const books = state.books ?? [];
        set({
          books: books.map((b) => {
            if (b.id !== bookId) return b;
            const nextStatus = patch.status ?? b.status;
            const nextTotal =
              patch.totalPages !== undefined
                ? patch.totalPages > 0
                  ? Math.round(patch.totalPages)
                  : undefined
                : b.totalPages;
            return {
              ...b,
              title: patch.title !== undefined ? patch.title.trim() || b.title : b.title,
              author:
                patch.author !== undefined
                  ? patch.author.trim() || undefined
                  : b.author,
              totalPages: nextTotal,
              status: nextStatus,
              finishedAtIso:
                nextStatus === "finished"
                  ? b.finishedAtIso ?? new Date().toISOString()
                  : undefined,
            };
          }),
        });
      },

      deleteBook: (bookId) => {
        const state = get();
        const remaining = (state.books ?? []).filter((b) => b.id !== bookId);
        const nextActive =
          state.activeBookId === bookId
            ? remaining.find((b) => b.status === "reading")?.id ??
              remaining[0]?.id ??
              null
            : state.activeBookId;
        set({
          books: remaining,
          activeBookId: nextActive,
        });
      },

      logBookPage: (bookId, newPage) => {
        const state = get();
        const books = state.books ?? [];
        const book = books.find((b) => b.id === bookId);
        const key = getTodayKey();
        const existing = state.days[key] ?? createEmptyDay(key);
        const minPages = state.readingMinPages || 5;

        if (!book) {
          return {
            pagesDelta: 0,
            todayPages: getDailyReadingPages(existing),
            floorJustCleared: false,
            xpAwarded: 0,
            finishedBook: false,
          };
        }

        const cleanPage = Math.max(0, Math.round(newPage));
        const pagesDelta = cleanPage - book.currentPage;
        if (pagesDelta === 0) {
          return {
            pagesDelta: 0,
            todayPages: getDailyReadingPages(existing),
            floorJustCleared: false,
            xpAwarded: 0,
            finishedBook: false,
          };
        }

        const entry: ReadingLogEntry = {
          id: makeId("rd"),
          timeIso: new Date().toISOString(),
          bookId: book.id,
          bookTitle: book.title,
          fromPage: book.currentPage,
          toPage: cleanPage,
          pagesDelta,
        };

        const finishedBook = Boolean(book.totalPages && cleanPage >= book.totalPages);
        const nextReadingLogs = [...(existing.readingLogs ?? []), entry];
        const nextDay: DayRecord = {
          ...existing,
          readingLogs: nextReadingLogs,
        };
        const todayPages = getDailyReadingPages(nextDay);

        let xpAwarded = 0;
        let floorJustCleared = false;
        let readingFloorXpAwarded = Boolean(existing.readingFloorXpAwarded);
        if (todayPages >= minPages && !readingFloorXpAwarded) {
          xpAwarded = applyMonarchXpBonus(25, state);
          floorJustCleared = true;
          readingFloorXpAwarded = true;
        }
        nextDay.readingFloorXpAwarded = readingFloorXpAwarded;

        const nowIso = new Date().toISOString();
        set({
          earnedXp: state.earnedXp + xpAwarded,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          books: books.map((b) => {
            if (b.id !== book.id) return b;
            const nextStatus: BookStatus = finishedBook
              ? "finished"
              : b.status === "finished" && b.totalPages && cleanPage < b.totalPages
                ? "reading"
                : b.status === "paused"
                  ? "reading"
                  : b.status;
            return {
              ...b,
              currentPage: cleanPage,
              status: nextStatus,
              finishedAtIso: nextStatus === "finished" ? b.finishedAtIso ?? nowIso : undefined,
            };
          }),
          days: {
            ...state.days,
            [key]: nextDay,
          },
        });

        return {
          pagesDelta,
          todayPages,
          floorJustCleared,
          xpAwarded,
          finishedBook,
        };
      },

      logBookPagesDelta: (bookId, deltaPages) => {
        const state = get();
        const book = (state.books ?? []).find((b) => b.id === bookId);
        if (!book) {
          const existing = state.days[getTodayKey()];
          return {
            pagesDelta: 0,
            todayPages: getDailyReadingPages(existing),
            floorJustCleared: false,
            xpAwarded: 0,
            finishedBook: false,
          };
        }
        return get().logBookPage(bookId, book.currentPage + deltaPages);
      },

      removeReadingEntry: (dateKey, entryId) => {
        const state = get();
        const day = state.days[dateKey];
        if (!day || !day.readingLogs?.length) return;
        const target = day.readingLogs.find((r) => r.id === entryId);
        if (!target) return;

        const nextLogs = day.readingLogs.filter((r) => r.id !== entryId);
        const books = state.books ?? [];
        const updatedBooks = books.map((b) => {
          if (b.id !== target.bookId) return b;
          const revertedPage =
            b.currentPage === target.toPage
              ? Math.max(0, target.fromPage)
              : Math.max(0, b.currentPage - target.pagesDelta);
          const nextStatus: BookStatus =
            b.status === "finished" && b.totalPages && revertedPage < b.totalPages
              ? "reading"
              : b.status;
          return {
            ...b,
            currentPage: revertedPage,
            status: nextStatus,
            finishedAtIso: nextStatus === "finished" ? b.finishedAtIso : undefined,
          };
        });

        set({
          books: updatedBooks,
          pendingSyncDates: enqueuePending(state.pendingSyncDates, dateKey),
          days: {
            ...state.days,
            [dateKey]: {
              ...day,
              readingLogs: nextLogs,
            },
          },
        });
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
        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);
      },

      lockDinnerSkip: () => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        if (existing.dinnerSkipped && !existing.dinnerOutMode) {
          return { xpAwarded: 0, alreadyLocked: true };
        }
        const xpAwarded = existing.earlySealXpAwarded ? 0 : applyMonarchXpBonus(30, state);
        const lateNightsDelta = existing.earlySealXpAwarded ? 0 : 1;
        const updatedDays = {
          ...state.days,
          [key]: {
            ...existing,
            dinnerSkipped: true,
            dinnerOutMode: false,
            earlySealXpAwarded: true,
          },
        };
        const streak = computeStreakAndCombo(updatedDays);
        set({
          earnedXp: state.earnedXp + xpAwarded,
          lateNightsSaved: state.lateNightsSaved + lateNightsDelta,
          bestActiveStreak: Math.max(state.bestActiveStreak || 14, streak.activeStreak),
          bestFastingStreak: Math.max(state.bestFastingStreak || 6, streak.fastingStreak),
          bestCombo: Math.max(state.bestCombo || 14, streak.comboDay),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: updatedDays,
        });
        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);
        return { xpAwarded, alreadyLocked: false };
      },

      logScaleWeight: (kg, bodyFatPct = null, bodyWaterPct = null) => {
        const clamped = Math.round(Math.max(45, Math.min(200, kg)) * 10) / 10;
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);

        const cleanBf =
          bodyFatPct !== null && bodyFatPct !== undefined && bodyFatPct > 0
            ? Math.round(bodyFatPct * 10) / 10
            : existing.bodyFatPct ?? state.bodyFatPct;
        const cleanBw =
          bodyWaterPct !== null && bodyWaterPct !== undefined && bodyWaterPct > 0
            ? Math.round(bodyWaterPct * 10) / 10
            : existing.bodyWaterPct ?? state.bodyWaterPct;

        const nextDays: Record<string, DayRecord> = {
          ...state.days,
          [key]: {
            ...existing,
            scaleWeightKg: clamped,
            bodyFatPct: cleanBf,
            bodyWaterPct: cleanBw,
          },
        };

        const reconciled = reconcileWeightAndRecords({
          ...state,
          days: nextDays,
          rawWeight: clamped,
        });

        set({
          ...reconciled,
          bodyFatPct: cleanBf,
          bodyWaterPct: cleanBw,
          earnedXp: state.earnedXp + (existing.scaleWeightKg === null ? 15 : 0),
          pendingSyncDates: enqueuePending(state.pendingSyncDates, key),
          days: nextDays,
        });

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return { ema: reconciled.weightEma, raw: clamped };
      },

      setSamsungSteps: (steps, allowLower = false) => {
        const key = getTodayKey();
        const state = get();
        const existing = state.days[key] ?? createEmptyDay(key);
        const nextSteps = allowLower
          ? Math.max(0, Math.round(steps))
          : Math.max(existing.samsungSteps ?? 0, Math.round(steps));

        let rawXp = 0;
        let verticalGainM = 0;
        let steps10kAwarded = existing.steps10kAwarded ?? false;
        let steps15kAwarded = existing.steps15kAwarded ?? false;

        if (nextSteps >= 10000 && !steps10kAwarded) {
          steps10kAwarded = true;
          rawXp += 30;
          verticalGainM += 45;
        }
        if (nextSteps >= 15000 && !steps15kAwarded) {
          steps15kAwarded = true;
          rawXp += 15;
          verticalGainM += 35;
        }

        const xpAwarded = rawXp > 0 ? applyMonarchXpBonus(rawXp, state) : 0;
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

        fireWebhookIfConfigured(state.webhookUrl, get().syncWithLedger);

        return { xpAwarded, verticalGainM };
      },

      setWebhookUrl: (webhookUrl) => set({ webhookUrl }),

      setLedgerSheetId: (ledgerSheetId) => set({ ledgerSheetId }),

      setSyncToken: (syncToken) => set({ syncToken }),

      setTargets: (patch) =>
        set((s) => ({
          kcalTarget:
            patch.kcalTarget !== undefined
              ? Math.max(1450, Math.min(3500, Math.round(patch.kcalTarget)))
              : s.kcalTarget,
          proteinTargetG:
            patch.proteinTargetG !== undefined
              ? Math.max(100, Math.min(260, Math.round(patch.proteinTargetG)))
              : s.proteinTargetG,
          stepTarget:
            patch.stepTarget !== undefined
              ? Math.max(4000, Math.min(30000, Math.round(patch.stepTarget)))
              : s.stepTarget,
          readingMinPages:
            patch.readingMinPages !== undefined
              ? Math.max(1, Math.min(100, Math.round(patch.readingMinPages)))
              : s.readingMinPages,
        })),

      syncWithLedger: async () => {
        if (inFlightSync) return inFlightSync;

        const runSync = async (): Promise<{ ok: boolean; message: string }> => {
          const state = get();
          const url = state.webhookUrl.trim();
          if (!url) {
            return { ok: false, message: "Paste your MONARCH_LEDGER Apps Script Web App URL in Profile first." };
          }
          if (typeof window === "undefined") {
            return { ok: false, message: "Sync runs in browser only." };
          }

          const todayKey = getTodayKey();
          const datesToPush = Array.from(new Set([...state.pendingSyncDates, todayKey]));
          const pushDays = datesToPush.map((dt) => {
            const day = state.days[dt] ?? createEmptyDay(dt);
            const totals = getDailyTotals(day, state.kcalTarget, state.proteinTargetG);
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
              workoutsCount: day.workouts.length + (day.survivalFloorCleared ? 1 : 0),
              benchBestE1rmKg: state.benchBest.e1rm,
              kiliTotalM: state.kiliMeters,
              readingPages: getDailyReadingPages(day),
            };
          });

          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                source: "monarch_pwa",
                reason: "two_way_sync",
                token: state.syncToken?.trim() || undefined,
                days: pushDays,
              }),
              redirect: "follow",
            });
            if (!res.ok) {
              return { ok: false, message: `HTTP ${res.status} from Apps Script.` };
            }
            const json = (await res.json()) as {
              ok?: boolean;
              error?: string;
              syncedAt?: string;
              todayMetrics?: {
                date: string;
                rawWeightKg?: number | null;
                weightEmaKg?: number | null;
                bodyFatPct?: number | null;
                bodyWaterPct?: number | null;
                samsungSteps?: number;
                hcStepsLive?: boolean;
                swimSportMin?: number;
                sleepHours?: number | null;
              } | null;
              recentMetrics?: Array<{
                date: string;
                rawWeightKg?: number | null;
                weightEmaKg?: number | null;
                bodyFatPct?: number | null;
                bodyWaterPct?: number | null;
                samsungSteps?: number;
                hcStepsLive?: boolean;
                swimSportMin?: number;
                sleepHours?: number | null;
              }>;
              coachOverrides?: {
                coach_banner?: string;
                step_target?: number;
                protein_floor_g?: number;
                kcal_target?: number;
              };
            };

            if (!json?.ok) {
              return { ok: false, message: json?.error || "Apps Script returned error response." };
            }

            const latest = get();
            const mergedDays = { ...latest.days };
            let bonusXp = 0;
            let bonusKili = 0;
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
              const steps =
                isLive || cur.pendingStepReset
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
              const sleepHrs = m.sleepHours ?? cur.sleepHours ?? null;

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
                swimSportMin: m.swimSportMin ?? cur.swimSportMin,
                sleepHours: sleepHrs,
              };

              if (m.date === todayKey || (rawKg !== null && m.date >= (json.todayMetrics?.date || todayKey))) {
                if (bf !== null) nextBf = bf;
                if (bw !== null) nextBw = bw;
              }
            }

            const reconciled = reconcileWeightAndRecords({
              ...latest,
              days: mergedDays,
            });

            const coachBanner = String(json.coachOverrides?.coach_banner || "");
            const stepTarget =
              Number(json.coachOverrides?.step_target) > 0
                ? Number(json.coachOverrides?.step_target)
                : latest.stepTarget;
            const proteinTargetG =
              Number(json.coachOverrides?.protein_floor_g) >= 100
                ? Math.round(Number(json.coachOverrides?.protein_floor_g))
                : latest.proteinTargetG;
            const kcalTarget =
              Number(json.coachOverrides?.kcal_target) >= 1450
                ? Math.round(Number(json.coachOverrides?.kcal_target))
                : latest.kcalTarget;

            set({
              days: mergedDays,
              ...reconciled,
              earnedXp: latest.earnedXp + bonusXp,
              kiliMeters: latest.kiliMeters + bonusKili,
              bodyFatPct: nextBf,
              bodyWaterPct: nextBw,
              coachBanner,
              stepTarget,
              proteinTargetG,
              kcalTarget,
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
        };

        inFlightSync = runSync().finally(() => {
          inFlightSync = null;
        });
        return inFlightSync;
      },

      backupSnapshotToLedger: async () => {
        const state = get();
        const url = state.webhookUrl.trim();
        if (!url) {
          return { ok: false, message: "Configure Apps Script Web App URL first." };
        }
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "backup_snapshot",
              token: state.syncToken?.trim() || undefined,
              snapshotJson: state.exportJson(),
            }),
            redirect: "follow",
          });
          if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
          const json = (await res.json()) as { ok?: boolean; error?: string; chunks?: number };
          if (!json.ok) return { ok: false, message: json.error || "Cloud backup failed." };
          return {
            ok: true,
            message: `Full state backed up to MONARCH_LEDGER (${json.chunks || 1} chunk).`,
          };
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : "Cloud backup failed.",
          };
        }
      },

      restoreSnapshotFromLedger: async () => {
        const state = get();
        const url = state.webhookUrl.trim();
        if (!url) {
          return { ok: false, message: "Configure Apps Script Web App URL first." };
        }
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "restore_snapshot",
              token: state.syncToken?.trim() || undefined,
            }),
            redirect: "follow",
          });
          if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
          const json = (await res.json()) as {
            ok?: boolean;
            error?: string;
            snapshotJson?: string;
            backedUpAt?: string;
          };
          if (!json.ok || !json.snapshotJson) {
            return { ok: false, message: json.error || "No cloud backup found." };
          }
          const imported = get().importJson(json.snapshotJson);
          if (!imported.ok) {
            return { ok: false, message: imported.error || "Invalid cloud snapshot." };
          }
          return {
            ok: true,
            message: `Restored full state from ${json.backedUpAt?.slice(0, 16) || "MONARCH_LEDGER"}.`,
          };
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : "Cloud restore failed.",
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
          bestWeightEma: s.bestWeightEma,
          slainBossIds: s.slainBossIds,
          bodyFatPct: s.bodyFatPct,
          bodyWaterPct: s.bodyWaterPct,
          kcalTarget: s.kcalTarget,
          proteinTargetG: s.proteinTargetG,
          stepTarget: s.stepTarget,
          coachBanner: s.coachBanner,
          ledgerSheetId: s.ledgerSheetId,
          syncToken: s.syncToken,
          lastSyncedAt: s.lastSyncedAt,
          lastAutoContextDate: s.lastAutoContextDate,
          pendingSyncDates: s.pendingSyncDates,
          benchBest: s.benchBest,
          exerciseLogs: s.exerciseLogs,
          kiliMeters: s.kiliMeters,
          kiliChecklist: s.kiliChecklist ?? {},
          lastDeloadDate: s.lastDeloadDate ?? null,
          lateNightsSaved: s.lateNightsSaved,
          bestActiveStreak: s.bestActiveStreak,
          bestFastingStreak: s.bestFastingStreak,
          bestCombo: s.bestCombo,
          webhookUrl: s.webhookUrl,
          swappedExercises: s.swappedExercises,
          activeSession: s.activeSession,
          savedFoods: s.savedFoods ?? [],
          weeklyMealPlan: s.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN,
          weeklyMealPlanCustomized: Boolean(s.weeklyMealPlanCustomized),
          mealPlanVersion: s.mealPlanVersion ?? 3,
          books: s.books ?? [],
          activeBookId: s.activeBookId ?? null,
          readingMinPages: s.readingMinPages || 5,
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
          const mergedDays = parsed.days;
          const reconciled = reconcileWeightAndRecords({
            days: mergedDays,
            rawWeight: parsed.rawWeight ?? INITIAL_PERSISTED_STATE.rawWeight,
            weightEma: parsed.weightEma ?? INITIAL_PERSISTED_STATE.weightEma,
            bestWeightEma: parsed.bestWeightEma ?? INITIAL_PERSISTED_STATE.bestWeightEma,
            slainBossIds: parsed.slainBossIds ?? INITIAL_PERSISTED_STATE.slainBossIds,
            bestActiveStreak: parsed.bestActiveStreak ?? INITIAL_PERSISTED_STATE.bestActiveStreak,
            bestFastingStreak: parsed.bestFastingStreak ?? INITIAL_PERSISTED_STATE.bestFastingStreak,
            bestCombo: parsed.bestCombo ?? INITIAL_PERSISTED_STATE.bestCombo,
          });
          set({
            ...INITIAL_PERSISTED_STATE,
            ...parsed,
            ...reconciled,
            split: normalizeSplitId(parsed.split as unknown as string),
            gateRank: normalizeGateRankId(parsed.gateRank as unknown as string),
            exerciseLogs: parsed.exerciseLogs ?? INITIAL_PERSISTED_STATE.exerciseLogs,
            savedFoods: Array.isArray(parsed.savedFoods)
              ? parsed.savedFoods
              : INITIAL_PERSISTED_STATE.savedFoods,
            weeklyMealPlan: parsed.weeklyMealPlan
              ? { ...DEFAULT_WEEKLY_MEAL_PLAN, ...parsed.weeklyMealPlan }
              : INITIAL_PERSISTED_STATE.weeklyMealPlan,
            weeklyMealPlanCustomized: Boolean(parsed.weeklyMealPlanCustomized),
            mealPlanVersion:
              typeof parsed.mealPlanVersion === "number" ? parsed.mealPlanVersion : 3,
            books: Array.isArray(parsed.books)
              ? parsed.books
              : INITIAL_PERSISTED_STATE.books,
            activeBookId:
              typeof parsed.activeBookId === "string" || parsed.activeBookId === null
                ? parsed.activeBookId
                : null,
            readingMinPages:
              typeof parsed.readingMinPages === "number" && parsed.readingMinPages > 0
                ? parsed.readingMinPages
                : 5,
            kcalTarget:
              typeof parsed.kcalTarget === "number" && parsed.kcalTarget >= 1450
                ? parsed.kcalTarget
                : 1800,
            proteinTargetG:
              typeof parsed.proteinTargetG === "number" && parsed.proteinTargetG >= 100
                ? parsed.proteinTargetG
                : 165,
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
        if (state) {
          // Never wipe an existing user-configured webhookUrl or sheetId
          if (!state.webhookUrl?.trim() && DEFAULT_WEBHOOK_URL.trim()) {
            state.setWebhookUrl(DEFAULT_WEBHOOK_URL.trim());
          }
          if (!state.ledgerSheetId?.trim() && DEFAULT_LEDGER_SHEET_ID.trim()) {
            state.setLedgerSheetId(DEFAULT_LEDGER_SHEET_ID.trim());
          }
          // Only upgrade default weekly meal plan if user has NOT customized it
          if (
            !state.weeklyMealPlan ||
            !state.weeklyMealPlan.mon ||
            (!state.weeklyMealPlanCustomized && (state.mealPlanVersion ?? 1) < 3)
          ) {
            state.resetWeeklyMealPlan();
          }
          const cleanSplit = normalizeSplitId(state.split as unknown as string);
          const cleanRank = normalizeGateRankId(state.gateRank as unknown as string);
          if (cleanSplit !== state.split) state.setSplit(cleanSplit);
          if (cleanRank !== state.gateRank) state.setGateRank(cleanRank);
          if (state.activeSession) {
            const normSessSplit = normalizeSplitId(
              state.activeSession.split as unknown as string
            );
            const normSessRank = normalizeGateRankId(
              state.activeSession.gateRank as unknown as string
            );
            if (
              normSessSplit !== state.activeSession.split ||
              normSessRank !== state.activeSession.gateRank
            ) {
              state.discardActiveSession();
            }
          }
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
        bestWeightEma: state.bestWeightEma,
        slainBossIds: state.slainBossIds ?? ["gatekeeper"],
        bodyFatPct: state.bodyFatPct,
        bodyWaterPct: state.bodyWaterPct,
        kcalTarget: state.kcalTarget || 1800,
        proteinTargetG: state.proteinTargetG || 165,
        stepTarget: state.stepTarget || 12000,
        coachBanner: state.coachBanner,
        ledgerSheetId: state.ledgerSheetId,
        syncToken: state.syncToken ?? "",
        lastSyncedAt: state.lastSyncedAt,
        lastAutoContextDate: state.lastAutoContextDate ?? null,
        pendingSyncDates: state.pendingSyncDates,
        benchBest: state.benchBest,
        exerciseLogs: state.exerciseLogs,
        kiliMeters: state.kiliMeters,
        kiliChecklist: state.kiliChecklist ?? {},
        lastDeloadDate: state.lastDeloadDate ?? null,
        lateNightsSaved: state.lateNightsSaved,
        bestActiveStreak: state.bestActiveStreak ?? 14,
        bestFastingStreak: state.bestFastingStreak ?? 6,
        bestCombo: state.bestCombo ?? 14,
        webhookUrl: state.webhookUrl,
        swappedExercises: state.swappedExercises,
        activeSession: state.activeSession,
        savedFoods: state.savedFoods ?? [],
        weeklyMealPlan: state.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN,
        weeklyMealPlanCustomized: Boolean(state.weeklyMealPlanCustomized),
        mealPlanVersion: state.mealPlanVersion ?? 3,
        books: state.books ?? [],
        activeBookId: state.activeBookId ?? null,
        readingMinPages: state.readingMinPages || 5,
        days: state.days,
      }),
    }
  )
);
