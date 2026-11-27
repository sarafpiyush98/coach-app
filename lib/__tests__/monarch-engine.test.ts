import { describe, expect, it } from "vitest";
import {
  computeNutritionCoachAdvice,
  DEFAULT_WEEKLY_MEAL_PLAN,
  evaluateFoodViability,
  FOOD_PRESETS,
  getPrescribedWorkout,
  isPlannedMealLogged,
  WEEKDAY_ORDER,
} from "../monarch-catalog";
import {
  computeStreakAndCombo,
  computeWeeklyTraining,
  createEmptyDay,
  isRealActivityDay,
  syncBossSlainIds,
  useMonarchStore,
  type DayRecord,
} from "../monarch-store";
import {
  computeAdaptiveTdeeCheckin,
  DEFAULT_EMA_ALPHA,
  recomputeWeightTrend,
  shiftDateKey,
} from "../weight-engine";

describe("Weight EMA & Adaptive TDEE Engine", () => {
  it("computes deterministic EMA idempotently regardless of repeated weigh-ins or syncs", () => {
    const days: Record<string, DayRecord> = {
      "2026-11-20": { ...createEmptyDay("2026-11-20"), scaleWeightKg: 112.4 },
      "2026-11-21": { ...createEmptyDay("2026-11-21"), scaleWeightKg: 116.4 }, // +4 kg water spike
      "2026-11-22": { ...createEmptyDay("2026-11-22"), scaleWeightKg: 115.0 },
      "2026-11-25": { ...createEmptyDay("2026-11-25"), scaleWeightKg: 111.8 }, // 3-day gap + whoosh
    };

    const run1 = recomputeWeightTrend(days, 112.4, 112.4, DEFAULT_EMA_ALPHA, "2026-11-25");
    const run2 = recomputeWeightTrend(days, 112.4, 112.4, DEFAULT_EMA_ALPHA, "2026-11-25");
    expect(run1.latestEmaKg).toBe(run2.latestEmaKg);
    expect(run1.emaByDate["2026-11-21"]).toBe(113.0); // shielded from +4kg raw spike
    expect(run1.series14d).toHaveLength(14);
  });

  it("classifies water spikes vs whooshes calmly and preserves slain bosses", () => {
    const days: Record<string, DayRecord> = {
      "2026-11-24": { ...createEmptyDay("2026-11-24"), scaleWeightKg: 109.8 },
      "2026-11-25": { ...createEmptyDay("2026-11-25"), scaleWeightKg: 113.8 }, // +4kg restaurant salt spike
    };
    const trend = recomputeWeightTrend(days, 110.2, 113.8, DEFAULT_EMA_ALPHA, "2026-11-25");
    expect(trend.fluctuationStatus).toBe("water_spike");
    expect(trend.rawVsEmaDeltaKg).toBeGreaterThanOrEqual(1.2);

    const slain = syncBossSlainIds(["gatekeeper", "iron_golem"], trend.latestEmaKg);
    expect(slain).toContain("iron_golem"); // never erased when weight bounces up
  });

  it("handles too_fast, on_track, plateau, and uptick regimes without recommending crash diets", () => {
    const baseDate = "2026-11-28";
    const mkSeries = (startKg: number, endKg: number): Record<string, DayRecord> => {
      const out: Record<string, DayRecord> = {};
      for (let i = 10; i >= 0; i--) {
        const dt = shiftDateKey(baseDate, -i);
        const frac = (10 - i) / 10;
        const w = Math.round((startKg + (endKg - startKg) * frac) * 10) / 10;
        out[dt] = {
          ...createEmptyDay(dt),
          scaleWeightKg: w,
          foods: [
            {
              id: `f_${i}`,
              timeIso: new Date().toISOString(),
              label: "OMAD Plate",
              kcal: 1750,
              proteinG: 165,
              multiplier: 1,
            },
          ],
        };
      }
      return out;
    };

    const uptickDays = mkSeries(110.0, 113.0);
    const uptickTrend = recomputeWeightTrend(uptickDays, 110.0, 113.0, DEFAULT_EMA_ALPHA, baseDate);
    const uptickCheckin = computeAdaptiveTdeeCheckin(uptickDays, 1800, uptickTrend, baseDate);
    expect(uptickCheckin.status).toBe("uptick");
    expect(uptickCheckin.recommendedKcal).toBeGreaterThanOrEqual(1650);

    const fastDays = mkSeries(116.0, 108.0);
    const fastTrend = recomputeWeightTrend(fastDays, 116.0, 108.0, DEFAULT_EMA_ALPHA, baseDate);
    const fastCheckin = computeAdaptiveTdeeCheckin(fastDays, 1800, fastTrend, baseDate);
    expect(fastCheckin.status).toBe("too_fast");
    expect(fastCheckin.recommendedKcal).toBe(1950);
  });
});

describe("Streaks, Igris Shield & Exploit Guards", () => {
  it("keeps Igris Shield working in the morning after missing yesterday", () => {
    const today = new Date(2026, 10, 28, 8, 30, 0); // 2026-11-28 08:30 local
    const days: Record<string, DayRecord> = {
      // 2026-11-28: nothing logged yet
      // 2026-11-27: MISSED
      "2026-11-26": { ...createEmptyDay("2026-11-26"), survivalFloorCleared: true, dinnerSkipped: true },
      "2026-11-25": { ...createEmptyDay("2026-11-25"), survivalFloorCleared: true, dinnerSkipped: true },
      "2026-11-24": { ...createEmptyDay("2026-11-24"), survivalFloorCleared: true },
    };

    const res = computeStreakAndCombo(days, today);
    expect(res.igrisShieldedThisWeek).toBe(true);
    expect(res.activeStreak).toBe(3);
    expect(res.fastingStreak).toBe(0); // strict consecutive dinnerSkipped count
  });

  it("does not count 0 kcal Diet Coke as active and caps consecutive rest days at 2", () => {
    const today = new Date(2026, 10, 28, 14, 0, 0);
    const dietCokeDay: DayRecord = {
      ...createEmptyDay("2026-11-28"),
      foods: [
        {
          id: "dc",
          presetId: "diet_coke",
          timeIso: new Date().toISOString(),
          label: "Diet Coke",
          kcal: 0,
          proteinG: 0,
          multiplier: 1,
        },
      ],
    };
    expect(isRealActivityDay(dietCokeDay)).toBe(false);

    const restSpamDays: Record<string, DayRecord> = {
      "2026-11-28": { ...createEmptyDay("2026-11-28"), restDay: true },
      "2026-11-27": { ...createEmptyDay("2026-11-27"), restDay: true },
      "2026-11-26": { ...createEmptyDay("2026-11-26"), restDay: true },
      "2026-11-25": { ...createEmptyDay("2026-11-25"), restDay: true },
    };
    const streak = computeStreakAndCombo(restSpamDays, today);
    expect(streak.activeStreak).toBeLessThanOrEqual(2);
  });
});

describe("Exercise Science & 100 kg Bench Isolation", () => {
  it("isolates heavy bench vs day 5 volume bench and prevents barbell failure on Low Time / Low Mana", () => {
    const upperA = getPrescribedWorkout("cg_gym", "upper_a", "regular");
    const fbPlus = getPrescribedWorkout("cg_gym", "full_body_plus", "regular");
    const benchHeavy = upperA.find((e) => e.id === "cg_bench");
    const benchVol = fbPlus.find((e) => e.id === "cg_bench_vol");

    expect(benchHeavy?.progressKey).toBe("cg_bench_heavy");
    expect(benchHeavy?.reps).toBe("5-8");
    expect(benchVol?.progressKey).toBe("cg_bench_vol");
    expect(benchVol?.reps).toBe("10-12");

    const expressUpperA = getPrescribedWorkout("cg_gym", "upper_a", "express_2x");
    const expressBench = expressUpperA.find((e) => e.id === "cg_bench");
    expect(expressBench?.sets).toBe(2);
    expect(expressBench?.reps).toContain("RIR 1-2");

    const lowManaUpperA = getPrescribedWorkout("cg_gym", "upper_a", "low_mana_rir2");
    expect(lowManaUpperA[0].sets).toBe(2);
    expect(lowManaUpperA[0].reps).toContain("RIR 2-3");

    const comboA = getPrescribedWorkout("cg_gym", "ul_combo_a", "regular");
    const comboB = getPrescribedWorkout("cg_gym", "ul_combo_b", "regular");
    expect(comboA).toHaveLength(7);
    expect(comboB).toHaveLength(7);
  });

  it("tracks curated U+L A credit as 2 core days and guards Bench PRs to <= 10 reps", () => {
    const store = useMonarchStore.getState();
    // Completing Day 5 volume 55 x 12 should NOT overwrite heavy benchBest (50x15 = 75)
    store.completeGateWorkout({
      split: "full_body_plus",
      arena: "cg_gym",
      gateRank: "regular",
      setsCompleted: 15,
      loggedExercises: [
        { key: "cg_bench_vol", weightKg: 57.5, reps: 12, isBench: true, allSetsAtCap: true },
      ],
    });
    expect(useMonarchStore.getState().benchBest.e1rm).toBe(75);
    expect(useMonarchStore.getState().exerciseLogs.cg_bench_vol.lastWeightKg).toBe(57.5);

    // Completing Heavy Bench 67.5 x 6 (e1RM = 81 kg) SHOULD crown a PR
    const resPr = useMonarchStore.getState().completeGateWorkout({
      split: "ul_combo_a",
      arena: "cg_gym",
      gateRank: "regular",
      setsCompleted: 21,
      loggedExercises: [
        { key: "cg_bench_heavy", weightKg: 67.5, reps: 6, isBench: true, allSetsAtCap: false },
      ],
    });
    expect(resPr.isPr).toBe(true);
    expect(resPr.newE1rm).toBe(81);
    expect(useMonarchStore.getState().exerciseLogs.cg_bench_heavy.allSetsAtCap).toBe(false);

    const weekly = computeWeeklyTraining(useMonarchStore.getState().days);
    expect(weekly.coreDoneCount).toBeGreaterThanOrEqual(2);
  });
});

describe("Nutrition Science, OMAD Plan & Reading Tracker", () => {
  it("ensures every day of default OMAD weekly meal plan hits >=1600 kcal & >=155g P", () => {
    for (const day of WEEKDAY_ORDER) {
      const plan = DEFAULT_WEEKLY_MEAL_PLAN[day.key];
      const kcal = plan.meals.reduce((s, m) => s + m.kcal, 0);
      const protein = plan.meals.reduce((s, m) => s + m.proteinG, 0);
      expect(kcal).toBeGreaterThanOrEqual(1600);
      expect(kcal).toBeLessThanOrEqual(2000);
      expect(protein).toBeGreaterThanOrEqual(155);
    }
  });

  it("grades produce, healthy fats, alcohol, and 0-kcal beverages accurately", () => {
    const salad = FOOD_PRESETS.find((p) => p.id === "cucumber_salad_olive")!;
    const nuts = FOOD_PRESETS.find((p) => p.id === "mixed_nuts_30g")!;
    const whisky = FOOD_PRESETS.find((p) => p.id === "whisky_peg")!;
    const dietCoke = FOOD_PRESETS.find((p) => p.id === "diet_coke")!;
    const chicken = FOOD_PRESETS.find((p) => p.id === "chicken_breast_200g")!;

    expect(evaluateFoodViability(salad.kcal, salad.proteinG, salad.tags).tier).toBe("M");
    expect(evaluateFoodViability(nuts.kcal, nuts.proteinG, nuts.tags).tier).toBe("F");
    expect(evaluateFoodViability(whisky.kcal, whisky.proteinG, whisky.tags).tier).toBe("X");
    expect(evaluateFoodViability(dietCoke.kcal, dietCoke.proteinG, dietCoke.tags).tier).toBe("0");
    expect(evaluateFoodViability(chicken.kcal, chicken.proteinG, chicken.tags).tier).toBe("S");
  });

  it("matches planned meals by presetId or exact label without 14-char prefix collision", () => {
    const plannedChicken = {
      id: "m1",
      slot: "lunch" as const,
      presetId: "hebe_salsa_chicken",
      label: "Hebe's Salsa Egg + Chicken",
      kcal: 680,
      proteinG: 65,
    };
    const loggedSolo = [{ presetId: "hebe_salsa_solo", label: "Hebe's Salsa Egg (Solo)" }];
    expect(isPlannedMealLogged(plannedChicken, loggedSolo)).toBe(false);

    const advice = computeNutritionCoachAdvice({
      consumedKcal: 1100,
      consumedProteinG: 165,
      kcalCeiling: 1800,
      proteinTargetG: 165,
      dinnerSkipped: true,
      dinnerOutMode: false,
      loggedFoods: [],
    });
    expect(advice.tone).toBe("amber");
    expect(advice.headline).toContain("light");
  });

  it("updates book pages across multiple same-day logs and reverts non-latest undo cleanly", () => {
    const store = useMonarchStore.getState();
    const book = store.addBook({ title: "The 5 Types of Wealth", currentPage: 10, totalPages: 320 });
    store.logBookPage(book.id, 18); // +8p
    store.logBookPage(book.id, 25); // +7p

    const todayKey = new Date().toISOString().slice(0, 10);
    const localTodayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const day = useMonarchStore.getState().days[localTodayKey] ?? useMonarchStore.getState().days[todayKey];
    const logs = day?.readingLogs ?? [];
    expect(logs.length).toBeGreaterThanOrEqual(2);

    // Undo the FIRST entry (+8p) rather than the latest
    useMonarchStore.getState().removeReadingEntry(localTodayKey, logs[0].id);
    const updatedBook = useMonarchStore.getState().books.find((b) => b.id === book.id);
    expect(updatedBook?.currentPage).toBe(17); // 25 - 8 = 17
  });
});
