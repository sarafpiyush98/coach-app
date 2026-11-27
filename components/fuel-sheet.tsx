"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useToastStore } from "@/components/ui/system-toast";
import {
  evaluateFoodViability,
  FOOD_PRESETS,
  getPresetsForContext,
  type MealSlot,
} from "@/lib/monarch-catalog";
import {
  createEmptyDay,
  getDailyTotals,
  getTodayKey,
  useMonarchStore,
} from "@/lib/monarch-store";
import { playQuestComplete, playShadowArise, playSystemPing } from "@/lib/sounds";

type FuelTab = "for_you" | "all" | "saved" | "new";

interface PlateItem {
  key: string;
  presetId?: string;
  savedFoodId?: string;
  label: string;
  spot?: string;
  kcal: number;
  proteinG: number;
  multiplier: number;
  isAbsRaid?: boolean;
  isSeal?: boolean;
}

const SLOT_OPTIONS: { id: MealSlot; label: string }[] = [
  { id: "primer", label: "Primer" },
  { id: "lunch", label: "Lunch" },
  { id: "seal", label: "5 PM Seal" },
  { id: "dinner", label: "Dinner" },
];

export function tierBadgeStyle(tier: "S" | "A" | "B" | "C"): string {
  if (tier === "S") {
    return "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/35";
  }
  if (tier === "A") {
    return "bg-[#3b6cf6]/15 text-[#60a5fa] border border-[#3b6cf6]/35";
  }
  if (tier === "B") {
    return "bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/35";
  }
  return "bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/35";
}

function defaultSlotForClock(dinnerOutMode?: boolean): MealSlot {
  const hr = new Date().getHours();
  if (dinnerOutMode && hr >= 18) return "dinner";
  if (hr < 11) return "primer";
  if (hr < 16) return "lunch";
  if (hr < 19) return "seal";
  return dinnerOutMode ? "dinner" : "seal";
}

export function FuelSheet({
  open,
  onClose,
  initialTab = "for_you",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: FuelTab;
}) {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const todayKey = getTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);
  const totals = getDailyTotals(today);

  const [tab, setTab] = useState<FuelTab>(initialTab);
  const [slot, setSlot] = useState<MealSlot>(() =>
    defaultSlotForClock(today.dinnerOutMode)
  );
  const [query, setQuery] = useState("");
  const [plate, setPlate] = useState<PlateItem[]>([]);

  // Custom / Viability form
  const [customLabel, setCustomLabel] = useState("");
  const [customSpot, setCustomSpot] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSlot(defaultSlotForClock(today.dinnerOutMode));
    }
  }, [open, initialTab, today.dinnerOutMode]);

  const contextPresets = useMemo(
    () => getPresetsForContext(store.context),
    [store.context]
  );

  const savedFoods = store.savedFoods ?? [];

  const allSortedPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = FOOD_PRESETS.filter((p) => {
      if (!q) return true;
      return (
        p.shortLabel.toLowerCase().includes(q) ||
        p.spot.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q)
      );
    });
    if (slot === "dinner") {
      return [...list].sort((a, b) => {
        const aDinner = a.category === "dinner_dish" ? 0 : 1;
        const bDinner = b.category === "dinner_dish" ? 0 : 1;
        return aDinner - bDinner;
      });
    }
    return list;
  }, [query, slot]);

  const filteredForYou = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contextPresets.filter((p) => {
      if (!q) return true;
      return (
        p.shortLabel.toLowerCase().includes(q) ||
        p.spot.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q)
      );
    });
  }, [contextPresets, query]);

  const filteredSaved = useMemo(() => {
    const q = query.trim().toLowerCase();
    return savedFoods.filter((item) => {
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.spot ?? "").toLowerCase().includes(q)
      );
    });
  }, [savedFoods, query]);

  const plateSummary = useMemo(() => {
    const kcal = plate.reduce(
      (acc, item) => acc + Math.round(item.kcal * item.multiplier),
      0
    );
    const proteinG = plate.reduce(
      (acc, item) => acc + Math.round(item.proteinG * item.multiplier),
      0
    );
    const viability = evaluateFoodViability(kcal, proteinG);
    return {
      kcal,
      proteinG,
      viability,
      afterKcal: totals.kcal + kcal,
      afterProtein: totals.proteinG + proteinG,
    };
  }, [plate, totals.kcal, totals.proteinG]);

  const customKcalNum = Math.max(0, Number(customKcal) || 0);
  const customProteinNum = Math.max(0, Number(customProtein) || 0);
  const hasCustomInput = customKcal.trim() !== "" || customProtein.trim() !== "";
  const liveViability = useMemo(
    () => evaluateFoodViability(customKcalNum, customProteinNum),
    [customKcalNum, customProteinNum]
  );

  if (!open) return null;

  function addOrBumpPlate(item: Omit<PlateItem, "multiplier">) {
    playSystemPing();
    setPlate((prev) => {
      const idx = prev.findIndex((p) => p.key === item.key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          multiplier: Math.round((next[idx].multiplier + 0.5) * 100) / 100,
        };
        return next;
      }
      return [...prev, { ...item, multiplier: 1 }];
    });
  }

  function stepPlateItem(key: string, delta: number) {
    setPlate((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const nextMult = Math.round((item.multiplier + delta) * 100) / 100;
          return { ...item, multiplier: nextMult };
        })
        .filter((item) => item.multiplier > 0)
    );
  }

  function getPlateQty(key: string): number {
    return plate.find((p) => p.key === key)?.multiplier ?? 0;
  }

  function handleSaveComboToLibrary() {
    if (plate.length === 0) return;
    const comboLabel =
      plate.length === 1
        ? plate[0].label
        : `${plate
            .slice(0, 2)
            .map((p) => p.label.split("(")[0].trim())
            .join(" + ")}${plate.length > 2 ? ` +${plate.length - 2}` : ""}`;
    store.saveCustomFood({
      label: comboLabel,
      spot: "Saved Plate Combo",
      kcal: plateSummary.kcal,
      proteinG: plateSummary.proteinG,
      defaultSlot: slot,
    });
    playQuestComplete();
    addToast({
      title: "COMBO SAVED TO MY FOODS",
      message: `${comboLabel} (${plateSummary.viability.tier}-Tier · ${plateSummary.proteinG}g P / ${plateSummary.kcal} kcal)`,
      variant: "success",
      duration: 2400,
    });
  }

  function handleLogPlate() {
    if (plate.length === 0) return;
    const res = store.logFoodBatch(plate, slot);
    if (res.hasAbsRaid) {
      playShadowArise();
      addToast({
        title: "AB's LUNCH RAID LOGGED (+75 XP RAID)",
        message: "Dinner Skip auto-sealed cleanly.",
        variant: "warning",
      });
    } else {
      playQuestComplete();
      addToast({
        title:
          res.count === 1
            ? `${plate[0].label.toUpperCase()} LOGGED`
            : `${res.count} DISHES LOGGED (${slot.toUpperCase()})`,
        message: `+${res.totalProteinG}g P · +${res.totalKcal} kcal · +${res.xpAwarded} XP`,
        variant: "success",
        duration: 2500,
      });
    }
    setPlate([]);
    setQuery("");
    onClose();
  }

  function handleSaveCustom(mode: "save_only" | "save_and_plate") {
    if (!customLabel.trim()) return;
    const saved = store.saveCustomFood({
      label: customLabel.trim(),
      spot: customSpot.trim() || undefined,
      kcal: customKcalNum,
      proteinG: customProteinNum,
      defaultSlot: slot,
    });
    playQuestComplete();
    if (mode === "save_and_plate") {
      addOrBumpPlate({
        key: `saved:${saved.id}`,
        savedFoodId: saved.id,
        label: saved.label,
        spot: saved.spot,
        kcal: saved.kcal,
        proteinG: saved.proteinG,
        isSeal: slot === "seal",
      });
      setTab("saved");
    } else {
      addToast({
        title: "DISH SAVED TO MY FOODS",
        message: `${saved.label} (${liveViability.tier}-Tier · ${saved.proteinG}g P / ${saved.kcal} kcal)`,
        variant: "success",
        duration: 2200,
      });
      setTab("saved");
    }
    setCustomLabel("");
    setCustomSpot("");
    setCustomKcal("");
    setCustomProtein("");
  }

  const remainingKcal = Math.max(0, totals.targetKcal - totals.kcal);
  const remainingProtein = Math.max(0, totals.targetProteinG - totals.proteinG);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border-subtle)] space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Log meal &amp; build plate
              </h3>
              <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                Left today: {remainingProtein}g P · {remainingKcal} kcal
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close fuel sheet"
            >
              <X size={16} />
            </button>
          </div>

          {/* Slot Selector */}
          <div className="grid grid-cols-4 gap-1 bg-[var(--surface-0)] p-1 rounded-xl">
            {SLOT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSlot(opt.id)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  slot === opt.id
                    ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: "for_you", label: "For You" },
                { id: "all", label: "All Dishes" },
                { id: "saved", label: `Saved (${savedFoods.length})` },
                { id: "new", label: "+ New" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`h-8 rounded-lg text-[11px] sm:text-xs font-medium transition-colors truncate px-1 ${
                  tab === t.id
                    ? "bg-[#3b6cf6] text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search input on list tabs */}
          {tab !== "new" && (
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  tab === "all"
                    ? "Search tandoori, tikka, prawns, dosa, beer, whey..."
                    : "Filter dishes or spots..."
                }
                className="w-full h-9 pl-8 pr-8 rounded-xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-2.5">
          {(tab === "for_you" || tab === "all") &&
            (tab === "for_you" ? filteredForYou : allSortedPresets).map((preset) => {
              const key = `preset:${preset.id}`;
              const qty = getPlateQty(key);
              const viability = evaluateFoodViability(preset.kcal, preset.proteinG);
              return (
                <div
                  key={preset.id}
                  className={`p-3 rounded-xl border transition-colors ${
                    qty > 0
                      ? "bg-[#3b6cf6]/10 border-[#3b6cf6]/45"
                      : "bg-[var(--surface-2)] border-transparent hover:border-[var(--border-subtle)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${tierBadgeStyle(
                            viability.tier
                          )}`}
                        >
                          {viability.tier}
                        </span>
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {preset.shortLabel}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                        {preset.spot} · {viability.proteinPer100Kcal}g P/100 kcal
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono tabular-nums text-xs">
                        <div className="text-[var(--text-primary)] font-semibold">
                          {preset.proteinG}g P
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          {preset.kcal} kcal
                        </div>
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center gap-1 bg-[var(--surface-0)] rounded-lg p-1 border border-[var(--border-subtle)]">
                          <button
                            onClick={() => stepPlateItem(key, -0.5)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            aria-label={`Decrease ${preset.shortLabel}`}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono text-xs font-semibold text-[var(--text-primary)] px-1">
                            {qty}x
                          </span>
                          <button
                            onClick={() => stepPlateItem(key, 0.5)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            aria-label={`Increase ${preset.shortLabel}`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            addOrBumpPlate({
                              key,
                              presetId: preset.id,
                              label: preset.shortLabel,
                              spot: preset.spot,
                              kcal: preset.kcal,
                              proteinG: preset.proteinG,
                              isAbsRaid: preset.tags.includes("abs_raid"),
                              isSeal: preset.tags.includes("seal"),
                            })
                          }
                          className="h-8 px-2.5 rounded-lg bg-[var(--surface-0)] hover:bg-[#3b6cf6] text-[var(--text-primary)] text-xs font-medium flex items-center gap-1 border border-[var(--border-subtle)] transition-colors"
                        >
                          <Plus size={13} />
                          <span>Plate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {tab === "saved" && (
            <>
              {filteredSaved.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] text-center space-y-2.5">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    No saved dishes or combos yet
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Check any food&apos;s viability in + New, save it here, or stack multiple restaurant dishes and tap Save combo.
                  </p>
                  <button
                    onClick={() => setTab("new")}
                    className="h-9 px-4 rounded-xl bg-[#3b6cf6] text-white text-xs font-semibold"
                  >
                    + Add custom dish
                  </button>
                </div>
              ) : (
                filteredSaved.map((item) => {
                  const key = `saved:${item.id}`;
                  const qty = getPlateQty(key);
                  const viability = evaluateFoodViability(item.kcal, item.proteinG);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        qty > 0
                          ? "bg-[#3b6cf6]/10 border-[#3b6cf6]/45"
                          : "bg-[var(--surface-2)] border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${tierBadgeStyle(
                                viability.tier
                              )}`}
                            >
                              {viability.tier}
                            </span>
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {item.label}
                            </p>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                            {item.spot || "My Saved Foods"} · {viability.proteinPer100Kcal}g P/100 kcal
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right font-mono tabular-nums text-xs">
                            <div className="text-[var(--text-primary)] font-semibold">
                              {item.proteinG}g P
                            </div>
                            <div className="text-[var(--text-secondary)]">
                              {item.kcal} kcal
                            </div>
                          </div>

                          {qty > 0 ? (
                            <div className="flex items-center gap-1 bg-[var(--surface-0)] rounded-lg p-1 border border-[var(--border-subtle)]">
                              <button
                                onClick={() => stepPlateItem(key, -0.5)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)]"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="font-mono text-xs font-semibold px-1">
                                {qty}x
                              </span>
                              <button
                                onClick={() => stepPlateItem(key, 0.5)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)]"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                addOrBumpPlate({
                                  key,
                                  savedFoodId: item.id,
                                  label: item.label,
                                  spot: item.spot,
                                  kcal: item.kcal,
                                  proteinG: item.proteinG,
                                  isSeal: item.defaultSlot === "seal",
                                })
                              }
                              className="h-8 px-2.5 rounded-lg bg-[var(--surface-0)] hover:bg-[#3b6cf6] text-xs font-medium flex items-center gap-1 border border-[var(--border-subtle)]"
                            >
                              <Plus size={13} />
                              <span>Plate</span>
                            </button>
                          )}

                          <button
                            onClick={() => store.deleteSavedFood(item.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[#ef4444]"
                            aria-label={`Delete ${item.label}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === "new" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dish name (e.g. Chilli Chicken)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="col-span-2 px-3 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                  <input
                    type="text"
                    placeholder="Spot / Restaurant (optional)"
                    value={customSpot}
                    onChange={(e) => setCustomSpot(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="420"
                      value={customKcal}
                      onChange={(e) => setCustomKcal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="48"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Live Viability Meter */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#60a5fa]" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Food Viability Check
                    </span>
                  </div>
                  {hasCustomInput ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${tierBadgeStyle(
                        liveViability.tier
                      )}`}
                    >
                      {liveViability.label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Enter kcal &amp; protein
                    </span>
                  )}
                </div>
                {hasCustomInput && (
                  <>
                    <div className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                      {liveViability.proteinPer100Kcal}g P / 100 kcal ·{" "}
                      {liveViability.proteinCalPct}% protein calories
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {liveViability.verdict}
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSaveCustom("save_only")}
                  disabled={!customLabel.trim() || !hasCustomInput}
                  className="h-10 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] disabled:opacity-40 text-xs font-semibold text-[var(--text-primary)] transition-colors"
                >
                  Save to My Foods
                </button>
                <button
                  onClick={() => handleSaveCustom("save_and_plate")}
                  disabled={!customLabel.trim() || !hasCustomInput}
                  className="h-10 rounded-xl bg-[#3b6cf6] hover:bg-[#2f5ee5] disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                >
                  Save &amp; Add to Plate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Plate Queue */}
        {plate.length > 0 && (
          <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-0)] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${tierBadgeStyle(
                    plateSummary.viability.tier
                  )}`}
                >
                  {plateSummary.viability.tier}
                </span>
                <span className="font-semibold text-[var(--text-primary)] truncate">
                  Plate: {plate.length} {plate.length === 1 ? "dish" : "dishes"}
                </span>
              </div>
              <span className="font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                +{plateSummary.proteinG}g P · +{plateSummary.kcal} kcal
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {plate.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[11px] text-[var(--text-primary)]"
                >
                  <span className="truncate max-w-[140px]">
                    {item.multiplier === 1
                      ? item.label
                      : `${item.label} (${item.multiplier}x)`}
                  </span>
                  <button
                    onClick={() => stepPlateItem(item.key, -item.multiplier)}
                    className="text-[var(--text-muted)] hover:text-[#ef4444]"
                    aria-label={`Remove ${item.label} from plate`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>

            <div className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] flex items-center justify-between">
              <span>
                After log: {plateSummary.afterProtein}/{totals.targetProteinG}g P
              </span>
              <span
                className={
                  plateSummary.afterKcal > totals.targetKcal + 150
                    ? "text-[#f87171]"
                    : "text-[var(--text-muted)]"
                }
              >
                {plateSummary.afterKcal}/{totals.targetKcal} kcal
              </span>
            </div>

            <div className="flex items-center gap-2">
              {plate.length >= 2 && (
                <button
                  onClick={handleSaveComboToLibrary}
                  className="h-11 px-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 shrink-0"
                >
                  <BookmarkPlus size={14} />
                  <span>Save combo</span>
                </button>
              )}
              <button
                onClick={handleLogPlate}
                className="flex-1 h-11 rounded-xl bg-[#3b6cf6] hover:bg-[#2f5ee5] text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check size={15} />
                <span>
                  Log {plate.length} {plate.length === 1 ? "dish" : "dishes"} ({slot})
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
