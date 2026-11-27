export const DEFAULT_EMA_ALPHA = 0.14;

export interface WeightDayLike {
  date?: string;
  scaleWeightKg: number | null;
  foods?: Array<{ kcal: number }>;
}

export type WeightFluctuationStatus = "water_spike" | "whoosh" | "steady";

export interface WeightSeriesPoint {
  date: string;
  raw: number | null;
  ema: number;
}

export interface WeightTrendSummary {
  latestRawKg: number;
  latestEmaKg: number;
  bestEmaKg: number;
  rawVsEmaDeltaKg: number;
  weeklyRateKg: number | null;
  weighInCount14d: number;
  fluctuationStatus: WeightFluctuationStatus;
  fluctuationNote: string;
  emaByDate: Record<string, number>;
  series14d: WeightSeriesPoint[];
}

export type AdaptiveTdeeStatus =
  | "calibrating"
  | "too_fast"
  | "on_track"
  | "plateau"
  | "uptick";

export interface AdaptiveTdeeCheckin {
  status: AdaptiveTdeeStatus;
  avgLoggedKcal7d: number | null;
  loggedDaysCount7d: number;
  recommendedKcal: number;
  deltaKcal: number;
  headline: string;
  detail: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateUtcMs(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

export function diffCalendarDays(fromKey: string, toKey: string): number {
  const a = parseDateUtcMs(fromKey);
  const b = parseDateUtcMs(toKey);
  if (a === null || b === null) return 1;
  return Math.round((b - a) / 86400000);
}

export function shiftDateKey(dateKey: string, offsetDays: number): string {
  const ms = parseDateUtcMs(dateKey);
  if (ms === null) return dateKey;
  const d = new Date(ms + offsetDays * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidWeightKg(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val >= 40 && val <= 220;
}

/**
 * Computes a calendar-gap-aware exponential moving average deterministically
 * from daily raw weigh-ins so repeated same-day logs or ledger syncs never
 * compound or corrupt the trend line.
 */
export function recomputeWeightTrend(
  days: Record<string, WeightDayLike>,
  baselineEma = 112.4,
  baselineRaw = 112.4,
  alpha = DEFAULT_EMA_ALPHA,
  refDateKey?: string
): WeightTrendSummary {
  const validDates = Object.keys(days)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && isValidWeightKg(days[k]?.scaleWeightKg))
    .sort();

  const emaByDate: Record<string, number> = {};
  let prevDate: string | null = null;
  let runningEma = round1(baselineEma);
  let bestEmaKg = runningEma;
  let latestRawKg = round1(baselineRaw);

  for (const dt of validDates) {
    const raw = round1(days[dt].scaleWeightKg as number);
    const deltaDays =
      prevDate === null ? 1 : Math.min(14, Math.max(1, diffCalendarDays(prevDate, dt)));
    const effAlpha = 1 - Math.pow(1 - alpha, deltaDays);
    runningEma = round1(runningEma * (1 - effAlpha) + raw * effAlpha);
    emaByDate[dt] = runningEma;
    bestEmaKg = Math.min(bestEmaKg, runningEma);
    latestRawKg = raw;
    prevDate = dt;
  }

  const latestEmaKg = validDates.length > 0 ? runningEma : round1(baselineEma);
  const rawVsEmaDeltaKg = round1(latestRawKg - latestEmaKg);

  const endDateKey = refDateKey || localDateKey();
  const windowStartKey = shiftDateKey(endDateKey, -13);

  const series14d: WeightSeriesPoint[] = [];
  let carriedEma = round1(baselineEma);
  for (const dt of validDates) {
    if (dt < windowStartKey) {
      carriedEma = emaByDate[dt];
    } else {
      break;
    }
  }

  let weighInCount14d = 0;
  for (let i = 0; i < 14; i++) {
    const dt = shiftDateKey(windowStartKey, i);
    const rec = days[dt];
    const raw = isValidWeightKg(rec?.scaleWeightKg) ? round1(rec.scaleWeightKg) : null;
    if (raw !== null) {
      weighInCount14d += 1;
    }
    if (emaByDate[dt] !== undefined) {
      carriedEma = emaByDate[dt];
    }
    series14d.push({
      date: dt,
      raw,
      ema: carriedEma,
    });
  }

  // Weekly trend rate: compare latest EMA vs an anchor weigh-in 5..21 days earlier
  let weeklyRateKg: number | null = null;
  if (validDates.length >= 2) {
    const latestDt = validDates[validDates.length - 1];
    let bestAnchor: { dt: string; span: number } | null = null;

    for (let i = validDates.length - 2; i >= 0; i--) {
      const candidateDt = validDates[i];
      const span = diffCalendarDays(candidateDt, latestDt);
      if (span < 4) continue;
      if (span > 28 && bestAnchor) break;
      if (!bestAnchor) {
        bestAnchor = { dt: candidateDt, span };
      } else if (Math.abs(span - 10) < Math.abs(bestAnchor.span - 10)) {
        bestAnchor = { dt: candidateDt, span };
      }
      if (span >= 7 && span <= 14) {
        bestAnchor = { dt: candidateDt, span };
        break;
      }
    }

    if (bestAnchor && bestAnchor.span >= 4) {
      const anchorEma = emaByDate[bestAnchor.dt];
      weeklyRateKg = round2(((latestEmaKg - anchorEma) / bestAnchor.span) * 7);
    }
  }

  let fluctuationStatus: WeightFluctuationStatus = "steady";
  let fluctuationNote =
    "Scale weight is tracking cleanly with your trend (normal daily noise is +/-0.8 kg).";

  if (rawVsEmaDeltaKg >= 1.2) {
    fluctuationStatus = "water_spike";
    fluctuationNote = `+${rawVsEmaDeltaKg} kg above trend - typical sodium, glycogen, or travel water swing. Trend stays shielded; hold protein + hydration steady.`;
  } else if (rawVsEmaDeltaKg <= -1.0) {
    fluctuationStatus = "whoosh";
    fluctuationNote = `${rawVsEmaDeltaKg} kg below trend - post-deficit water drop. Keep hitting your regular protein & calorie floor.`;
  }

  return {
    latestRawKg,
    latestEmaKg,
    bestEmaKg,
    rawVsEmaDeltaKg,
    weeklyRateKg,
    weighInCount14d,
    fluctuationStatus,
    fluctuationNote,
    emaByDate,
    series14d,
  };
}

/**
 * Calm MacroFactor-style weekly expenditure check-in across upward, flat,
 * optimal, and overly aggressive weight trends without recommending crash deficits.
 */
export function computeAdaptiveTdeeCheckin(
  days: Record<string, WeightDayLike>,
  currentTargetKcal: number,
  trend: WeightTrendSummary,
  refDateKey?: string
): AdaptiveTdeeCheckin {
  const endKey = refDateKey || localDateKey();
  const loggedKcals: number[] = [];

  for (let i = 0; i < 7; i++) {
    const dt = shiftDateKey(endKey, -i);
    const foods = days[dt]?.foods ?? [];
    const total = foods.reduce((sum, f) => sum + (f.kcal || 0), 0);
    if (total >= 800) {
      loggedKcals.push(total);
    }
  }

  const loggedDaysCount7d = loggedKcals.length;
  const avgLoggedKcal7d =
    loggedDaysCount7d > 0
      ? Math.round(loggedKcals.reduce((a, b) => a + b, 0) / loggedDaysCount7d)
      : null;

  if (trend.weighInCount14d < 4 || trend.weeklyRateKg === null) {
    return {
      status: "calibrating",
      avgLoggedKcal7d,
      loggedDaysCount7d,
      recommendedKcal: currentTargetKcal,
      deltaKcal: 0,
      headline: `Calibrating trend (${trend.weighInCount14d}/4 weigh-ins in 14d)`,
      detail:
        "Log 4+ morning weigh-ins over 14 days and full OMAD intake to unlock adaptive calorie calibration.",
    };
  }

  const rate = trend.weeklyRateKg;

  if (rate < -1.25) {
    const recommendedKcal = Math.min(2200, Math.max(1650, currentTargetKcal + 150));
    return {
      status: "too_fast",
      avgLoggedKcal7d,
      loggedDaysCount7d,
      recommendedKcal,
      deltaKcal: recommendedKcal - currentTargetKcal,
      headline: `Losing fast (${rate} kg/wk) - raise ceiling to ${recommendedKcal} kcal`,
      detail:
        "Dropping >1.25 kg/wk risks bench strength loss, gallbladder stress, and rebound cravings. Add +150 kcal of whole food.",
    };
  }

  if (rate <= -0.45) {
    return {
      status: "on_track",
      avgLoggedKcal7d,
      loggedDaysCount7d,
      recommendedKcal: currentTargetKcal,
      deltaKcal: 0,
      headline: `On target (${rate} kg/wk) - hold ${currentTargetKcal} kcal`,
      detail:
        "Ideal cut pace (~0.5-1.1% bodyweight/wk) to strip fat while driving your 100 kg bench progression.",
    };
  }

  if (rate <= 0.15) {
    const adherenceTight =
      avgLoggedKcal7d !== null &&
      loggedDaysCount7d >= 4 &&
      avgLoggedKcal7d <= currentTargetKcal + 100;
    const recommendedKcal = adherenceTight
      ? Math.max(1600, currentTargetKcal - 100)
      : currentTargetKcal;
    return {
      status: "plateau",
      avgLoggedKcal7d,
      loggedDaysCount7d,
      recommendedKcal,
      deltaKcal: recommendedKcal - currentTargetKcal,
      headline:
        recommendedKcal < currentTargetKcal
          ? `Flat trend (${rate >= 0 ? `+${rate}` : rate} kg/wk) - trim to ${recommendedKcal} kcal`
          : `Flat trend (${rate >= 0 ? `+${rate}` : rate} kg/wk) - hold ${currentTargetKcal} kcal & audit`,
      detail:
        recommendedKcal < currentTargetKcal
          ? "Intake is tight and trend slowed. A small -100 kcal trim or +1.5k daily steps restores steady loss."
          : "Verify restaurant sauces, oils, and weekend logs before cutting calories below your current target.",
    };
  }

  const safeHold = Math.max(1650, currentTargetKcal);
  return {
    status: "uptick",
    avgLoggedKcal7d,
    loggedDaysCount7d,
    recommendedKcal: safeHold,
    deltaKcal: safeHold - currentTargetKcal,
    headline: `Trend ticked up (+${rate} kg/wk) - stay calm at ${safeHold} kcal`,
    detail:
      "Weight naturally fluctuates up after travel, salt, hard training, or restaurant meals. Never crash-diet below 1,650 kcal; hit 165g+ protein, 4L water, and 12k steps as water clears.",
  };
}
