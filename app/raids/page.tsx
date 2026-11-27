"use client";

import { useMemo } from "react";
import {
  Award,
  Check,
  CheckCircle2,
  Flame,
  Mountain,
  Shield,
  Skull,
  Sparkles,
} from "lucide-react";
import { WeightTrendChart } from "@/components/weight-trend-chart";
import { useToastStore } from "@/components/ui/system-toast";
import { KILI_CHECKLIST_ITEMS, WEIGHT_RAID_BOSSES } from "@/lib/monarch-catalog";
import {
  computeStreakAndCombo,
  computeWeeklyKiliStats,
  isDayActive,
  useMonarchStore,
} from "@/lib/monarch-store";
import { useTodayKey } from "@/lib/use-today-key";
import {
  computeAdaptiveTdeeCheckin,
  DEFAULT_EMA_ALPHA,
  recomputeWeightTrend,
  shiftDateKey,
} from "@/lib/weight-engine";
import { playSystemPing } from "@/lib/sounds";

export default function RaidsPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);
  const todayKey = useTodayKey();
  const streak = computeStreakAndCombo(store.days);

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

  const tdeeCheckin = useMemo(
    () =>
      computeAdaptiveTdeeCheckin(
        store.days,
        store.kcalTarget || 1800,
        weightTrend,
        todayKey
      ),
    [store.days, store.kcalTarget, weightTrend, todayKey]
  );

  const kiliStats = useMemo(
    () => computeWeeklyKiliStats(store.days),
    [store.days]
  );

  const last28Days = useMemo(() => {
    const cells: { key: string; workout: boolean; seal: boolean; active: boolean }[] = [];
    for (let i = 27; i >= 0; i--) {
      const key = shiftDateKey(todayKey, -i);
      const rec = store.days[key];
      const workout = Boolean(
        rec &&
          (rec.survivalFloorCleared ||
            rec.workouts.length > 0 ||
            rec.movements.length > 0)
      );
      const seal = Boolean(rec?.dinnerSkipped);
      cells.push({
        key,
        workout,
        seal,
        active: isDayActive(rec),
      });
    }
    return cells;
  }, [store.days, todayKey]);

  const activeWeightBossIdx = WEIGHT_RAID_BOSSES.findIndex(
    (b) => store.weightEma > b.targetKg
  );
  const currentWeightBoss =
    activeWeightBossIdx >= 0
      ? WEIGHT_RAID_BOSSES[activeWeightBossIdx]
      : WEIGHT_RAID_BOSSES[WEIGHT_RAID_BOSSES.length - 1];
  const weightRange = Math.max(currentWeightBoss.floorKg - currentWeightBoss.targetKg, 1);
  const weightProgress = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((currentWeightBoss.floorKg - store.weightEma) / weightRange) * 100
      )
    )
  );

  const benchHeavyLog = store.exerciseLogs?.cg_bench_heavy;
  const benchHeavyE1rm = Math.max(
    store.benchBest.e1rm,
    benchHeavyLog?.bestE1rm ?? 0
  );
  const benchVol = store.exerciseLogs?.cg_bench_vol;
  const benchPct = Math.min(100, Math.round((benchHeavyE1rm / 100) * 100));

  const kiliGoal = 5895;
  const kiliPct = Math.min(100, Math.round((store.kiliMeters / kiliGoal) * 100));
  const zone2Pct = Math.min(
    100,
    Math.round((kiliStats.zone2MinutesThisWeek / kiliStats.zone2TargetMin) * 100)
  );

  const estKcalAvoided = store.lateNightsSaved * 750;
  const estRupeesSaved = store.lateNightsSaved * 450;

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-24 space-y-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Simultaneous Raid Dungeons
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Trend weight, 100 kg Bench &amp; Kilimanjaro readiness
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface-1)] border border-[var(--border-subtle)] font-mono text-xs text-[#fbbf24]">
          <Flame size={12} /> {streak.activeStreak}d
        </span>
      </header>

      {/* RAID I: VESSEL MASS (TREND VS RAW + ADAPTIVE TDEE) */}
      <section className="rounded-2xl monarch-hero p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#60a5fa]">
              RAID I · VESSEL MASS (ALPHA 0.14 TREND)
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase mt-0.5 flex items-center gap-1.5 text-[var(--text-primary)]">
              <Skull size={15} className="text-[#ef4444]" />
              {currentWeightBoss.name} ({currentWeightBoss.targetKg} kg)
            </h2>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">
              {store.weightEma} kg
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Raw: {store.rawWeight} · Best: {store.bestWeightEma}
            </div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div
            className="h-full progress-blue transition-all duration-300"
            style={{ width: `${weightProgress}%` }}
          />
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[var(--text-secondary)]">
              14-Day Trend (Line) vs Raw Scale (Dots)
            </span>
            <span className="font-mono text-[var(--text-muted)]">
              {weightTrend.weeklyRateKg !== null
                ? `${weightTrend.weeklyRateKg > 0 ? "+" : ""}${weightTrend.weeklyRateKg} kg/wk`
                : `${weightTrend.weighInCount14d} weigh-in(s)`}
            </span>
          </div>
          <WeightTrendChart series={weightTrend.series14d} height={140} />
          <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
            {weightTrend.fluctuationNote}
          </p>
        </div>

        {/* Adaptive TDEE Check-In */}
        <div className="p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#60a5fa]" />
              <span>{tdeeCheckin.headline}</span>
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              {tdeeCheckin.detail}
            </p>
          </div>
          {tdeeCheckin.deltaKcal !== 0 && (
            <button
              onClick={() => {
                store.setTargets({ kcalTarget: tdeeCheckin.recommendedKcal });
                playSystemPing();
                addToast({
                  title: `TARGET SET: ${tdeeCheckin.recommendedKcal} KCAL`,
                  variant: "info",
                });
              }}
              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#3b6cf6] text-white text-[11px] font-semibold"
            >
              Apply {tdeeCheckin.recommendedKcal}
            </button>
          )}
        </div>

        {/* Persistent Boss Milestones */}
        <div className="grid grid-cols-2 gap-1.5">
          {WEIGHT_RAID_BOSSES.map((boss) => {
            const currentlySlain = store.weightEma <= boss.targetKg;
            const previouslySlain = (store.slainBossIds ?? []).includes(boss.id);
            const badgeText = currentlySlain
              ? "SLAIN"
              : previouslySlain
                ? "RE-CONTESTED"
                : `${boss.targetKg}kg`;
            return (
              <div
                key={boss.id}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                  currentlySlain
                    ? "bg-[#22c55e]/10 border-[#22c55e]/35 text-[#4ade80]"
                    : previouslySlain
                      ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/35 text-[#c4b5fd]"
                      : boss.id === currentWeightBoss.id
                        ? "bg-[#3b6cf6]/10 border-[#3b6cf6]/45 text-[var(--text-primary)]"
                        : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase text-[10px] leading-tight pr-1">
                  {boss.name}
                </span>
                <span className="font-mono text-[10px] shrink-0">{badgeText}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* RAID II: VULCAN'S ANVIL (100 KG BENCH) */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#f59e0b]">
              RAID II · VULCAN&apos;S ANVIL
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase mt-0.5 flex items-center gap-1.5 text-[var(--text-primary)]">
              <Award size={15} className="text-[#f59e0b]" /> 100 KG Flat Barbell Bench
            </h2>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-sm font-bold text-[#f59e0b] whitespace-nowrap">
              {benchHeavyE1rm} / 100 kg
            </div>
            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
              Best: {store.benchBest.weightKg}kg x {store.benchBest.reps}
            </div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div
            className="h-full progress-gold transition-all duration-300"
            style={{ width: `${benchPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
          <span>Wave: 57.5-65 x 8 -&gt; 70-77.5 x 5 -&gt; 80-90 x 3 -&gt; 100 x 1 (Spotter)</span>
        </div>
        {benchVol && (
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            Day 5 Volume Touch: {benchVol.lastWeightKg}kg x {benchVol.lastReps} (isolated from Heavy PR track)
          </p>
        )}
      </section>

      {/* RAID III: UHURU PEAK (5,895m KILIMANJARO + READINESS CHECKLIST) */}
      <section className="rounded-2xl monarch-card p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#22c55e]">
              RAID III · UHURU PEAK EXPEDITION
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase mt-0.5 flex items-center gap-1.5 text-[var(--text-primary)]">
              <Mountain size={15} className="text-[#22c55e]" /> Mount Kilimanjaro (5,895m)
            </h2>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-sm font-bold text-[#4ade80] whitespace-nowrap">
              {store.kiliMeters} / {kiliGoal}m
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{kiliPct}% Ascent</div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div
            className="h-full progress-green transition-all duration-300"
            style={{ width: `${kiliPct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>Weekly Zone-2</span>
              <span className="font-mono text-[#4ade80]">
                {kiliStats.zone2MinutesThisWeek}/{kiliStats.zone2TargetMin}m
              </span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full progress-green transition-all duration-300"
                style={{ width: `${zone2Pct}%` }}
              />
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>Pack Inclines (wk)</span>
              <span className="font-mono text-[#60a5fa]">
                {kiliStats.packInclineCountThisWeek}x
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">
              10-15% grade w/ 6-8 kg pack
            </p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
            Expedition &amp; Foracort Readiness Gates
          </p>
          {KILI_CHECKLIST_ITEMS.map((item) => {
            const done = Boolean(store.kiliChecklist?.[item.id]);
            return (
              <button
                key={item.id}
                onClick={() => {
                  store.toggleKiliCheck(item.id);
                  playSystemPing();
                }}
                className={`w-full p-2.5 rounded-xl border flex items-start gap-2.5 text-left transition-colors ${
                  done
                    ? "bg-[#22c55e]/10 border-[#22c55e]/30"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] hover:border-[var(--border-accent)]"
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                    done
                      ? "bg-[#22c55e] border-[#22c55e] text-[#051b0e]"
                      : "border-[var(--text-muted)]"
                  }`}
                >
                  {done && <Check size={11} strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                    {item.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* GREED VAULT + 28-DAY NO-SKIP MATRIX */}
      <section className="rounded-2xl monarch-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#c4b5fd]">
            GREED VAULT · OMAD FAST DIVIDENDS
          </p>
          <CheckCircle2 size={14} className="text-[#8b5cf6]" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-base font-bold text-[#c4b5fd]">{store.lateNightsSaved}</div>
            <div className="text-[9px] text-[var(--text-muted)]">OMAD SEALED</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-base font-bold text-[#4ade80]">
              {estKcalAvoided.toLocaleString()}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">KCAL SAVED</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <div className="text-base font-bold text-[#f59e0b]">
              Rs {estRupeesSaved.toLocaleString()}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">SWIGGY SAVED</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl monarch-card p-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-1.5">
            <Shield size={13} className="text-[#3b6cf6]" /> 28-DAY NO-SKIP MATRIX
          </p>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {store.legacyWorkouts} prior CG sessions
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {last28Days.map((cell) => (
            <div
              key={cell.key}
              title={cell.key}
              className={`h-7 rounded-lg border flex items-center justify-center font-mono text-[9px] ${
                cell.workout && cell.seal
                  ? "bg-[#22c55e]/20 border-[#22c55e]/50 text-[#4ade80]"
                  : cell.active
                    ? "bg-[#3b6cf6]/20 border-[#3b6cf6]/50 text-[#93c5fd]"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              {cell.key.slice(8)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
