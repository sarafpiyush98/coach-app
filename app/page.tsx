"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bluetooth,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Lock,
  Plus,
  Scale,
  Sparkles,
  Timer,
  Utensils,
  X,
} from "lucide-react";
import { SystemPanel } from "@/components/ui/system-panel";
import { CombatSheet, formatRestDuration } from "@/components/combat-sheet";
import { MuteToggle } from "@/components/mute-toggle";
import { useToastStore } from "@/components/ui/system-toast";
import { canUseWebBluetooth, readBleScaleWeight } from "@/lib/ble-scale";
import {
  ARENAS,
  CONTEXT_LIST,
  CONTEXTS,
  GATE_RANKS,
  getPrescribedWorkout,
  getPresetsForContext,
  SPLITS,
  type ContextId,
} from "@/lib/monarch-catalog";
import {
  computeStreakAndCombo,
  createEmptyDay,
  getAmbientShadow,
  getDailyTotals,
  getTodayKey,
  levelFromMonarchXp,
  MOVEMENT_PRESETS,
  useMonarchStore,
  type MovementKind,
} from "@/lib/monarch-store";
import {
  playQuestComplete,
  playShadowArise,
  playSystemPing,
} from "@/lib/sounds";

export default function CommandDeckPage() {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const [combatOpen, setCombatOpen] = useState(false);
  const [portion, setPortion] = useState<0.5 | 1 | 1.5>(1);
  const [weightEditorOpen, setWeightEditorOpen] = useState(false);
  const [draftWeight, setDraftWeight] = useState(112.4);
  const [draftBf, setDraftBf] = useState("");
  const [draftBw, setDraftBw] = useState("");
  const [bleBusy, setBleBusy] = useState(false);
  const [bleReady, setBleReady] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const handledUrlRef = useRef(false);

  const todayKey = getTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);
  const totals = getDailyTotals(today);
  const totalXp = store.legacyXp + store.earnedXp;
  const lvl = levelFromMonarchXp(totalXp);
  const streak = computeStreakAndCombo(store.days);
  const directive = getAmbientShadow(store);

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
    const res = store.logFoodPreset(presetId, portion);
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
    setPortion(1);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kcal = Number(customKcal);
    const protein = Number(customProtein) || 0;
    if (!kcal) return;
    const res = store.logCustomFood(customLabel || "Custom Meal", kcal, protein);
    playQuestComplete();
    addToast({
      title: "CUSTOM FUEL LOGGED",
      message: `${kcal} kcal · ${protein}g P · +${res.xpAwarded} XP`,
      variant: "success",
    });
    setCustomLabel("");
    setCustomKcal("");
    setCustomProtein("");
    setCustomOpen(false);
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

  function handleSetSamsungSteps(steps: number) {
    const res = store.setSamsungSteps(steps);
    playQuestComplete();
    addToast({
      title: `SAMSUNG STEPS: ${steps.toLocaleString()}`,
      message:
        res.xpAwarded > 0
          ? `Milestone cleared · +${res.verticalGainM}m Kili · +${res.xpAwarded} XP`
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

  const activeRankSpec =
    GATE_RANKS.find((g) => g.id === store.gateRank) ?? GATE_RANKS[1];
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-3.5">
      {/* HEADER PANEL */}
      <SystemPanel variant="hero" className="p-3.5" animate={false}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-rajdhani)] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${lvl.rank.color}25`,
                  color: lvl.rank.color,
                  border: `1px solid ${lvl.rank.color}55`,
                }}
              >
                {lvl.rank.title}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] text-xs font-bold text-[var(--text-primary)]">
                LV {lvl.level}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-[family-name:var(--font-geist-mono)] text-[#f59e0b]">
                <Flame size={12} /> {streak.activeStreak}d · {streak.comboMultiplier}x
              </span>
            </div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-secondary)] mt-1">
              {lvl.xpIntoLevel}/{lvl.currentLevelXp} XP · {store.kiliMeters}m Kili · {store.benchBest.e1rm}kg Bench e1RM
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setWeightEditorOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-accent)] font-[family-name:var(--font-geist-mono)] text-xs font-semibold text-[var(--text-primary)]"
            >
              <Scale size={13} className="text-[#3b6cf6]" />
              {store.weightEma}kg{store.bodyFatPct ? ` · ${store.bodyFatPct}%` : ""}
            </button>
            <MuteToggle />
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
          <div
            className="h-full progress-blue transition-all duration-300"
            style={{ width: `${lvl.progress}%` }}
          />
        </div>

        {/* Inline Scale + OKOK Body-Comp + Web Bluetooth Scanner Drawer */}
        {weightEditorOpen && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--surface-0)] border border-[var(--border-accent)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-rajdhani)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                OKOK / SCALE (RAW KG):
              </span>
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-geist-mono)] text-xs">
                <button
                  onClick={() => setDraftWeight((w) => Math.round((w - 0.2) * 10) / 10)}
                  className="px-2 py-1 rounded bg-[var(--surface-2)]"
                >
                  -0.2
                </button>
                <span className="min-w-[50px] text-center font-bold">{draftWeight.toFixed(1)}</span>
                <button
                  onClick={() => setDraftWeight((w) => Math.round((w + 0.2) * 10) / 10)}
                  className="px-2 py-1 rounded bg-[var(--surface-2)]"
                >
                  +0.2
                </button>
                <button
                  onClick={handleSaveWeight}
                  className="ml-1 px-2.5 py-1 rounded bg-[#3b6cf6] text-white font-bold"
                >
                  SAVE
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                placeholder="OKOK BF %"
                value={draftBf}
                onChange={(e) => setDraftBf(e.target.value)}
                className="w-24 px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-[11px]"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Water %"
                value={draftBw}
                onChange={(e) => setDraftBw(e.target.value)}
                className="w-24 px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-[11px]"
              />
              {bleReady && (
                <button
                  onClick={handleBleScan}
                  disabled={bleBusy}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#22c55e]/20 border border-[#22c55e]/50 font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase text-[#4ade80] disabled:opacity-50"
                >
                  <Bluetooth size={11} /> {bleBusy ? "SCANNING..." : "SCAN BLE SCALE"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Single 4-Context Selector */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {CONTEXT_LIST.map((ctx) => {
            const active = store.context === ctx.id;
            return (
              <button
                key={ctx.id}
                onClick={() => store.setContext(ctx.id)}
                className={`py-1.5 px-1 rounded-md font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                  active
                    ? "bg-[#3b6cf6]/25 border-[#3b6cf6] text-white"
                    : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {ctx.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-[var(--text-secondary)] truncate">
            {CONTEXTS[store.context].sub}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={store.toggleLowMana}
              className={`px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-rajdhani)] font-bold uppercase border ${
                store.lowMana
                  ? "bg-[#8b5cf6]/25 border-[#8b5cf6] text-[#c4b5fd]"
                  : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              Low Mana
            </button>
            <button
              onClick={store.toggleDebloat}
              className={`px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-rajdhani)] font-bold uppercase border ${
                store.debloatMode
                  ? "bg-[#f59e0b]/25 border-[#f59e0b] text-[#fcd34d]"
                  : "bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              De-Bloat
            </button>
          </div>
        </div>
      </SystemPanel>

      {/* ANTIGRAVITY LIVE COACH OVERRIDE BANNER */}
      {store.coachBanner.trim() && (
        <div
          className="rounded-xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/45"
          style={{ borderLeftWidth: "3px", borderLeftColor: "#f59e0b" }}
        >
          <p className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.14em] text-[#fbbf24]">
            COACH OVERRIDE (LIVE FROM SHEET)
          </p>
          <p className="text-xs text-[var(--text-primary)] leading-snug mt-0.5">
            {store.coachBanner}
          </p>
        </div>
      )}

      {/* AMBIENT SHADOW DIRECTIVE */}
      {directive && (
        <div
          className="rounded-xl p-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-between gap-2.5"
          style={{ borderLeftWidth: "3px", borderLeftColor: directive.color }}
        >
          <div className="min-w-0">
            <p
              className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: directive.color }}
            >
              {directive.title}
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-snug mt-0.5">
              {directive.message}
            </p>
          </div>
          {directive.actionLabel && (
            <button
              onClick={handleDirectiveAction}
              className="shrink-0 px-2.5 py-1.5 rounded-lg font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: directive.color }}
            >
              {directive.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* CARD 1: TODAY'S GATE (WORKOUT & MOVEMENT) */}
      <SystemPanel className="p-3.5" animate={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Dumbbell size={14} className="text-[#3b6cf6]" />
            <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
              TODAY&apos;S GATE (NO SKIPS)
            </h2>
          </div>
          {workoutDoneToday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#4ade80] font-[family-name:var(--font-geist-mono)] text-[10px] font-bold">
              <Check size={11} /> GREEN
            </span>
          )}
        </div>

        {/* Resume Active Long-Rest Session */}
        {activeResume && (
          <button
            onClick={() => {
              store.setSplit(activeResume.split);
              store.setArena(activeResume.arena);
              store.setGateRank(activeResume.gateRank);
              setCombatOpen(true);
            }}
            className="mt-2.5 w-full px-3 py-2 rounded-xl bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/50 flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-[#fbbf24] shrink-0" />
              <div>
                <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                  RESUME IN-PROGRESS GATE ({activeResume.checkedSets}/{activeResume.totalSets} SETS)
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-secondary)]">
                  {activeResume.lastSetAtMs
                    ? `RESTING ${formatRestDuration(
                        Math.max(0, Math.floor((nowMs - activeResume.lastSetAtMs) / 1000))
                      )} · TAP TO CONTINUE`
                    : "SAVED OFFLINE · TAP TO CONTINUE"}
                </div>
              </div>
            </div>
            <span className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase text-[#fbbf24]">
              OPEN
            </span>
          </button>
        )}

        {/* Effort Tier */}
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {GATE_RANKS.map((rank) => {
            const active = store.gateRank === rank.id;
            return (
              <button
                key={rank.id}
                onClick={() => store.setGateRank(rank.id)}
                className={`py-1.5 px-2 rounded-lg border text-left transition-colors ${
                  active
                    ? "bg-[#3b6cf6]/20 border-[#3b6cf6] text-white"
                    : "bg-[var(--surface-2)]/60 border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase">
                  {rank.label}
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[9px] opacity-80">
                  {rank.duration} · +{rank.baseXp}XP
                </div>
              </button>
            );
          })}
        </div>

        {/* Split & Arena Pickers */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {SPLITS.map((sp) => (
            <button
              key={sp.id}
              onClick={() => store.setSplit(sp.id)}
              className={`py-1.5 rounded-md font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase border ${
                store.split === sp.id
                  ? "bg-[var(--surface-3)] border-[#3b6cf6]/70 text-white"
                  : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {ARENAS.map((ar) => (
            <button
              key={ar.id}
              onClick={() => store.setArena(ar.id)}
              className={`py-1 rounded font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider border ${
                store.arena === ar.id
                  ? "bg-[var(--surface-3)] border-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                  : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
              }`}
            >
              {ar.shortLabel}
            </button>
          ))}
        </div>

        {/* Prescribed Preview */}
        <p className="mt-2 text-[11px] text-[var(--text-secondary)] truncate">
          {prescribedPreview.map((e) => e.name).join(" · ")}
        </p>

        {/* Primary Action */}
        <div className="mt-2.5 flex gap-2">
          {store.gateRank === "floor_5m" ? (
            <>
              <button
                onClick={handleClear5mFloor}
                className="flex-1 h-11 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.14em] text-[#051b0e]"
              >
                CLEAR 2-SET FLOOR · +35 XP
              </button>
              <button
                onClick={() => setCombatOpen(true)}
                className="px-3 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase text-[var(--text-secondary)]"
              >
                HUD
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCombatOpen(true)}
                className="flex-1 h-11 rounded-xl bg-[#3b6cf6] hover:bg-[#2a5be6] font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.14em] text-white"
              >
                ENTER GATE · {activeRankSpec.label.toUpperCase()}
              </button>
              <button
                onClick={handleClear5mFloor}
                className="px-3 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase text-[var(--text-secondary)]"
                title="Quick 2-set No-Skip survival check-in"
              >
                2-Set Floor
              </button>
            </>
          )}
        </div>

        {/* Quick Cardio / Swim / Badminton / Kili Chips */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <Footprints size={12} className="shrink-0 text-[var(--text-muted)]" />
          {(Object.keys(MOVEMENT_PRESETS) as MovementKind[]).map((kind) => {
            const mp = MOVEMENT_PRESETS[kind];
            return (
              <button
                key={kind}
                onClick={() => handleQuickMove(kind)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-secondary)]"
              >
                {mp.label} (+{mp.verticalGainM}m)
              </button>
            );
          })}
        </div>

        {/* Samsung Health Step Tracker Bar */}
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-[family-name:var(--font-geist-mono)] text-[var(--text-secondary)]">
              SAMSUNG STEPS:{" "}
              <strong className="text-[var(--text-primary)]">
                {samsungSteps.toLocaleString()}
              </strong>{" "}
              / {store.stepTarget.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 font-[family-name:var(--font-geist-mono)] text-[10px]">
              <button
                onClick={() => handleSetSamsungSteps(samsungSteps + 2500)}
                className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                +2.5k
              </button>
              <button
                onClick={() => handleSetSamsungSteps(Math.max(samsungSteps, 10000))}
                className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                10k
              </button>
              <button
                onClick={() => handleSetSamsungSteps(Math.max(samsungSteps, 15000))}
                className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                15k
              </button>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                samsungSteps >= 10000 ? "progress-green" : "progress-blue"
              }`}
              style={{ width: `${stepPct}%` }}
            />
          </div>
        </div>
      </SystemPanel>

      {/* CARD 2: VESSEL FUEL (LUNCH-OMAD + SKIP DINNER) */}
      <SystemPanel className="p-3.5" animate={false}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Utensils size={14} className="text-[#f59e0b]" />
            <h2 className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
              VESSEL FUEL (LUNCH + SKIP DINNER)
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {([0.5, 1, 1.5] as const).map((mult) => (
              <button
                key={mult}
                onClick={() => setPortion(mult)}
                className={`px-1.5 py-0.5 rounded font-[family-name:var(--font-geist-mono)] text-[10px] font-bold border ${
                  portion === mult
                    ? "bg-[#3b6cf6]/25 border-[#3b6cf6] text-white"
                    : "bg-[var(--surface-0)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {mult}x
              </button>
            ))}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className="ml-1 px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase text-[var(--text-secondary)] inline-flex items-center gap-0.5"
            >
              <Plus size={10} /> Custom
            </button>
          </div>
        </div>

        {/* Macro Bars */}
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase text-[#f59e0b]">
                PROTEIN
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-bold">
                {totals.proteinG} / {totals.targetProteinG}g
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totals.proteinG >= 145 ? "progress-green" : "progress-gold"
                }`}
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="font-[family-name:var(--font-rajdhani)] font-bold uppercase text-[#3b6cf6]">
                KCAL {totals.activeFlexKcal > 0 ? `+${totals.activeFlexKcal}` : ""}
              </span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-bold">
                {totals.kcal} / {totals.targetKcal}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  overKcal ? "progress-red" : "progress-blue"
                }`}
                style={{ width: `${kcalPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Custom Inline Form */}
        {customOpen && (
          <form onSubmit={handleCustomSubmit} className="mt-2.5 grid grid-cols-12 gap-1.5">
            <input
              type="text"
              placeholder="Meal name"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="col-span-5 px-2.5 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs"
            />
            <input
              type="number"
              placeholder="kcal"
              value={customKcal}
              onChange={(e) => setCustomKcal(e.target.value)}
              className="col-span-3 px-2 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs font-[family-name:var(--font-geist-mono)]"
              required
            />
            <input
              type="number"
              placeholder="P (g)"
              value={customProtein}
              onChange={(e) => setCustomProtein(e.target.value)}
              className="col-span-2 px-2 py-1.5 rounded bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs font-[family-name:var(--font-geist-mono)]"
            />
            <button
              type="submit"
              className="col-span-2 rounded bg-[#3b6cf6] text-white font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase"
            >
              ADD
            </button>
          </form>
        )}

        {/* Context-Matched 1-Tap Spot Chips */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {contextPresets.map((preset) => {
            const isRaid = preset.tags.includes("abs_raid");
            const isSeal = preset.tags.includes("seal");
            const isSolo = preset.tags.includes("salsa_solo");
            const scaledKcal = Math.round(preset.kcal * portion);
            const scaledP = Math.round(preset.proteinG * portion);

            return (
              <button
                key={preset.id}
                onClick={() => handleFoodChip(preset.id)}
                className={`p-2 rounded-lg border text-left transition-colors ${
                  isRaid
                    ? "bg-[#8b5cf6]/15 border-[#8b5cf6]/45 hover:bg-[#8b5cf6]/25"
                    : isSeal
                      ? "bg-[#22c55e]/10 border-[#22c55e]/35 hover:bg-[#22c55e]/20"
                      : isSolo
                        ? "bg-[#f59e0b]/10 border-[#f59e0b]/35 hover:bg-[#f59e0b]/20"
                        : "bg-[var(--surface-2)]/70 border-[var(--border-subtle)] hover:border-[var(--border-accent)]"
                }`}
              >
                <div className="font-[family-name:var(--font-rajdhani)] text-xs font-bold leading-tight text-[var(--text-primary)] truncate">
                  {preset.shortLabel}
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-secondary)] mt-0.5">
                  {scaledKcal} kcal · <span className="text-[#f59e0b]">{scaledP}g P</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Today's Logged Meals */}
        {today.foods.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {today.foods.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-0)] border border-[var(--border-subtle)] font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-secondary)]"
              >
                {entry.label} ({entry.proteinG}g)
                <button
                  onClick={() => store.removeFoodEntry(todayKey, entry.id)}
                  className="text-[var(--text-muted)] hover:text-[#ef4444]"
                  aria-label={`Remove ${entry.label}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Signature Skip-Dinner Early Fasting Seal */}
        <button
          onClick={handleLockDinnerSkip}
          disabled={today.dinnerSkipped}
          className={`mt-3 w-full h-11 rounded-xl font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2 border transition-colors ${
            today.dinnerSkipped
              ? "bg-[#22c55e]/15 border-[#22c55e]/45 text-[#4ade80]"
              : "bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 border-[#8b5cf6] text-[#e9d5ff]"
          }`}
        >
          {today.dinnerSkipped ? (
            <>
              <Sparkles size={15} /> EARLY FASTING SEAL ACTIVE · DINNER SKIPPED
            </>
          ) : (
            <>
              <Lock size={14} /> LOCK DINNER SKIP · +30 XP EARLY SEAL
            </>
          )}
        </button>
      </SystemPanel>

      {/* Live Workout Combat Sheet */}
      <CombatSheet open={combatOpen} onClose={() => setCombatOpen(false)} />
    </div>
  );
}
