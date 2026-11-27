"use client";

import { useMemo } from "react";
import { Award, CheckCircle2, Flame, Mountain, Shield, Skull } from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { WEIGHT_RAID_BOSSES } from "@/lib/monarch-catalog";
import {
  computeStreakAndCombo,
  getTodayKey,
  isDayActive,
  useMonarchStore,
} from "@/lib/monarch-store";

export default function RaidsPage() {
  const store = useMonarchStore();
  const streak = computeStreakAndCombo(store.days);

  const last28Days = useMemo(() => {
    const cells: { key: string; workout: boolean; seal: boolean; active: boolean }[] = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getTodayKey(d);
      const rec = store.days[key];
      const workout = Boolean(rec && (rec.survivalFloorCleared || rec.workouts.length > 0 || rec.movements.length > 0));
      const seal = Boolean(rec?.dinnerSkipped);
      cells.push({
        key,
        workout,
        seal,
        active: isDayActive(rec),
      });
    }
    return cells;
  }, [store.days]);

  // Active Weight Raid Boss based on 7-day EMA
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

  // Vulcan's Anvil (100 kg Bench 1RM)
  const benchPct = Math.min(100, Math.round((store.benchBest.e1rm / 100) * 100));

  // Uhuru Peak (Mount Kilimanjaro 5,895m)
  const kiliGoal = 5895;
  const kiliPct = Math.min(100, Math.round((store.kiliMeters / kiliGoal) * 100));

  // Greed Vault Savings
  const estKcalAvoided = store.lateNightsSaved * 750;
  const estRupeesSaved = store.lateNightsSaved * 450;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.16em] text-[var(--text-primary)]">
            SIMULTANEOUS RAID DUNGEONS
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Three battlefronts so water bloat never stalls strength or altitude progress
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface-2)] font-[family-name:var(--font-geist-mono)] text-xs text-[#f59e0b]">
          <Flame size={12} /> {streak.activeStreak}d
        </span>
      </div>

      {/* RAID I: VESSEL MASS (7d EMA) */}
      <SystemPanel variant="hero" className="p-4" animate={false}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#3b6cf6]">
              RAID I · VESSEL MASS (7-DAY EMA)
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase mt-0.5 flex items-center gap-1.5">
              <Skull size={15} className="text-[#ef4444]" />
              {currentWeightBoss.name} (Target {currentWeightBoss.targetKg} kg)
            </h2>
          </div>
          <div className="text-right font-[family-name:var(--font-geist-mono)]">
            <div className="text-sm font-bold">{store.weightEma} kg EMA</div>
            <div className="text-[10px] text-[var(--text-muted)]">Raw: {store.rawWeight} kg</div>
          </div>
        </div>

        <div className="mt-2.5 h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div className="h-full progress-red transition-all duration-300" style={{ width: `${weightProgress}%` }} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {WEIGHT_RAID_BOSSES.map((boss) => {
            const slain = store.weightEma <= boss.targetKg;
            return (
              <div
                key={boss.id}
                className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                  slain
                    ? "bg-[#22c55e]/10 border-[#22c55e]/35 text-[#4ade80]"
                    : boss.id === currentWeightBoss.id
                      ? "bg-[#3b6cf6]/10 border-[#3b6cf6]/45 text-[var(--text-primary)]"
                      : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase truncate">
                  {boss.name}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] shrink-0">
                  {slain ? "SLAIN" : `${boss.targetKg}kg`}
                </span>
              </div>
            );
          })}
        </div>
      </SystemPanel>

      {/* RAID II: VULCAN'S ANVIL (100 KG BENCH) */}
      <SystemPanel className="p-4" animate={false}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#f59e0b]">
              RAID II · VULCAN&apos;S ANVIL
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase mt-0.5 flex items-center gap-1.5">
              <Award size={15} className="text-[#f59e0b]" /> 100 KG Flat Barbell Bench
            </h2>
          </div>
          <div className="text-right font-[family-name:var(--font-geist-mono)]">
            <div className="text-sm font-bold text-[#f59e0b]">{store.benchBest.e1rm} / 100 kg</div>
            <div className="text-[10px] text-[var(--text-muted)]">
              Best: {store.benchBest.weightKg}kg x {store.benchBest.reps}
            </div>
          </div>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div className="h-full progress-gold transition-all duration-300" style={{ width: `${benchPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
          Phase Gates: 62.5kg x 8 -&gt; 77.5kg x 5 -&gt; 90kg x 2-3 -&gt; 100kg x 1 (Mandatory Spotter)
        </p>
      </SystemPanel>

      {/* RAID III: UHURU PEAK (5,895m KILIMANJARO) */}
      <SystemPanel className="p-4" animate={false}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.15em] text-[#22c55e]">
              RAID III · UHURU PEAK EXPEDITION
            </p>
            <h2 className="font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase mt-0.5 flex items-center gap-1.5">
              <Mountain size={15} className="text-[#22c55e]" /> Mount Kilimanjaro (5,895m)
            </h2>
          </div>
          <div className="text-right font-[family-name:var(--font-geist-mono)]">
            <div className="text-sm font-bold text-[#4ade80]">
              {store.kiliMeters} / {kiliGoal}m
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{kiliPct}% Ascent</div>
          </div>
        </div>
        <div className="mt-2.5 h-2 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div className="h-full progress-green transition-all duration-300" style={{ width: `${kiliPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
          Zone-2 incline walks, CG pool laps, 10k-15k steps &amp; Sunday 8 AM badminton log vertical meters.
        </p>
      </SystemPanel>

      {/* GREED VAULT + 28-DAY CONSISTENCY */}
      <div className="grid grid-cols-1 gap-3">
        <SystemPanel className="p-4" animate={false}>
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[#8b5cf6]">
              GREED VAULT · SKIP-DINNER DIVIDENDS
            </p>
            <CheckCircle2 size={14} className="text-[#8b5cf6]" />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center font-[family-name:var(--font-geist-mono)]">
            <div className="p-2 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)]">
              <div className="text-base font-bold text-[#c4b5fd]">{store.lateNightsSaved}</div>
              <div className="text-[9px] text-[var(--text-muted)]">NIGHTS SEALED</div>
            </div>
            <div className="p-2 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)]">
              <div className="text-base font-bold text-[#4ade80]">{estKcalAvoided.toLocaleString()}</div>
              <div className="text-[9px] text-[var(--text-muted)]">KCAL SAVED</div>
            </div>
            <div className="p-2 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)]">
              <div className="text-base font-bold text-[#f59e0b]">Rs {estRupeesSaved.toLocaleString()}</div>
              <div className="text-[9px] text-[var(--text-muted)]">SWIGGY SAVED</div>
            </div>
          </div>
        </SystemPanel>

        <SystemPanel className="p-4" animate={false}>
          <div className="flex items-center justify-between mb-2">
            <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-1.5">
              <Shield size={13} className="text-[#3b6cf6]" /> 28-DAY NO-SKIP MATRIX
            </p>
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)]">
              82 prior CG sessions credited
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {last28Days.map((cell) => (
              <div
                key={cell.key}
                title={cell.key}
                className={`h-7 rounded border flex items-center justify-center font-[family-name:var(--font-geist-mono)] text-[9px] ${
                  cell.workout && cell.seal
                    ? "bg-[#22c55e]/25 border-[#22c55e] text-[#4ade80]"
                    : cell.active
                      ? "bg-[#3b6cf6]/25 border-[#3b6cf6] text-[#93c5fd]"
                      : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {cell.key.slice(8)}
              </div>
            ))}
          </div>
        </SystemPanel>
      </div>
    </div>
  );
}
