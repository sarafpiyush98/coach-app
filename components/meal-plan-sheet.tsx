"use client";

import { useMemo, useState } from "react";
import { Check, Plus, RotateCcw, Search, X } from "lucide-react";
import { tierBadgeStyle } from "@/components/fuel-sheet";
import { useToastStore } from "@/components/ui/system-toast";
import {
  DEFAULT_WEEKLY_MEAL_PLAN,
  evaluateFoodViability,
  FOOD_PRESETS,
  getTodayWeekdayKey,
  isPlannedMealLogged,
  WEEKDAY_ORDER,
  type MealSlot,
  type PlannedMealItem,
  type WeekdayKey,
} from "@/lib/monarch-catalog";
import { createEmptyDay, useMonarchStore } from "@/lib/monarch-store";
import { useTodayKey } from "@/lib/use-today-key";
import { playQuestComplete, playShadowArise, playSystemPing } from "@/lib/sounds";

const SLOT_ORDER: Record<MealSlot, number> = {
  lunch: 0,
  seal: 1,
  dinner: 2,
  primer: 3,
};

const SLOT_LABELS: Record<MealSlot, string> = {
  lunch: "OMAD Main",
  seal: "Protein Seal",
  dinner: "Dinner Out",
  primer: "Extra / AM",
};

function makePlannedMealId(dayKey: WeekdayKey): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${dayKey}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${dayKey}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function MealPlanSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const store = useMonarchStore();
  const addToast = useToastStore((s) => s.add);

  const todayWeekday = getTodayWeekdayKey();
  const [selectedDay, setSelectedDay] = useState<WeekdayKey>(todayWeekday);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickSlot, setPickSlot] = useState<MealSlot>("lunch");
  const [pickQuery, setPickQuery] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");

  const weeklyPlan = store.weeklyMealPlan ?? DEFAULT_WEEKLY_MEAL_PLAN;
  const dayPlan = weeklyPlan[selectedDay] ?? DEFAULT_WEEKLY_MEAL_PLAN[selectedDay];

  const todayKey = useTodayKey();
  const today = store.days[todayKey] ?? createEmptyDay(todayKey);

  const sortedMeals = useMemo(
    () =>
      [...dayPlan.meals].sort(
        (a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9)
      ),
    [dayPlan.meals]
  );

  const planTotals = useMemo(() => {
    const kcal = dayPlan.meals.reduce((acc, m) => acc + m.kcal, 0);
    const proteinG = dayPlan.meals.reduce((acc, m) => acc + m.proteinG, 0);
    return {
      kcal,
      proteinG,
      viability: evaluateFoodViability(kcal, proteinG),
    };
  }, [dayPlan.meals]);

  const addableOptions = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    const saved = (store.savedFoods ?? []).map((sf) => ({
      id: sf.id,
      label: sf.label,
      spot: sf.spot || "My Saved Foods",
      kcal: sf.kcal,
      proteinG: sf.proteinG,
      isSaved: true,
    }));
    const presets = FOOD_PRESETS.map((p) => ({
      id: p.id,
      label: p.shortLabel,
      spot: p.spot,
      kcal: p.kcal,
      proteinG: p.proteinG,
      isSaved: false,
    }));
    return [...saved, ...presets].filter((item) => {
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.spot.toLowerCase().includes(q)
      );
    });
  }, [store.savedFoods, pickQuery]);

  if (!open) return null;

  function setDayMode(mode: "skip_dinner" | "dinner_out") {
    playSystemPing();
    const isOut = mode === "dinner_out";
    store.updateWeeklyPlanDay(selectedDay, {
      dinnerOut: isOut,
      dinnerSkipped: !isOut,
    });
    if (selectedDay === todayWeekday) {
      store.setTodayDinnerOutMode(isOut);
    }
  }

  function handleRemovePlannedMeal(mealId: string) {
    store.updateWeeklyPlanDay(selectedDay, {
      meals: dayPlan.meals.filter((m) => m.id !== mealId),
    });
  }

  function handleAddPlannedItem(item: {
    id?: string;
    label: string;
    kcal: number;
    proteinG: number;
  }) {
    const newItem: PlannedMealItem = {
      id: makePlannedMealId(selectedDay),
      slot: pickSlot,
      presetId: item.id,
      label: item.label,
      kcal: Math.round(item.kcal),
      proteinG: Math.round(item.proteinG),
    };
    store.updateWeeklyPlanDay(selectedDay, {
      meals: [...dayPlan.meals, newItem],
    });
    playSystemPing();
    setPickerOpen(false);
    setPickQuery("");
    setCustomTitle("");
    setCustomKcal("");
    setCustomProtein("");
  }

  function handleLogPlannedMeal(meal: PlannedMealItem) {
    if (meal.presetId) {
      const res = store.logFoodPreset(meal.presetId, 1, meal.slot);
      if (res.label !== "Unknown") {
        if (res.isAbsRaid) {
          playShadowArise();
        } else {
          playQuestComplete();
        }
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

  function handleResetWeek() {
    store.resetWeeklyMealPlan();
    playSystemPing();
    addToast({
      title: "WEEKLY PLAN RESET",
      message: "Restored Mon-Sun OMAD balanced cut plan.",
      variant: "info",
      duration: 2200,
    });
  }

  const belowFloor = planTotals.kcal > 0 && planTotals.kcal < 1500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border-subtle)] space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Weekly meal plan
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Balanced OMAD structure (~1,650-1,930 kcal · greens + fats + &gt;=160g P)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetWeek}
                className="h-8 px-2.5 rounded-lg bg-[var(--surface-2)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                title="Restore default Mon-Sun meal plan"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close meal plan sheet"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mon-Sun Selector Strip */}
          <div className="grid grid-cols-7 gap-1 bg-[var(--surface-0)] p-1 rounded-xl">
            {WEEKDAY_ORDER.map((d) => {
              const isToday = d.key === todayWeekday;
              const isSelected = d.key === selectedDay;
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`py-1.5 rounded-lg text-[11px] font-medium flex flex-col items-center gap-0.5 transition-colors ${
                    isSelected
                      ? "bg-[#3b6cf6] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>{d.short}</span>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isToday
                        ? isSelected
                          ? "bg-white"
                          : "bg-[#22c55e]"
                        : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Day Summary & Dinner Strategy Toggle */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {dayPlan.focus}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] mt-0.5">
                  Planned: {planTotals.proteinG}g P · {planTotals.kcal} kcal
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold shrink-0 ${tierBadgeStyle(
                  planTotals.viability.tier
                )}`}
              >
                Day: {planTotals.viability.tier} ({planTotals.viability.proteinPer100Kcal}g/100)
              </span>
            </div>

            {belowFloor && (
              <p className="text-[11px] text-[#fbbf24]">
                Under 1,500 kcal planned - add eggs, nuts, fruit, or rice to protect muscle &amp; prevent midnight cravings.
              </p>
            )}

            <div className="grid grid-cols-2 gap-1.5 bg-[var(--surface-1)] p-1 rounded-xl">
              <button
                onClick={() => setDayMode("skip_dinner")}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !dayPlan.dinnerOut
                    ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/35"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                OMAD · Daytime
              </button>
              <button
                onClick={() => setDayMode("dinner_out")}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  dayPlan.dinnerOut
                    ? "bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/35"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                OMAD · Dinner Out
              </button>
            </div>
          </div>

          {/* Planned Meals List */}
          <div className="space-y-2">
            {sortedMeals.map((meal) => {
              const presetTags = FOOD_PRESETS.find((p) => p.id === meal.presetId)?.tags;
              const viability = evaluateFoodViability(
                meal.kcal,
                meal.proteinG,
                presetTags
              );
              const isLoggedToday =
                selectedDay === todayWeekday &&
                isPlannedMealLogged(meal, today.foods);

              return (
                <div
                  key={meal.id}
                  className="p-3 rounded-xl bg-[var(--surface-2)] flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                        {SLOT_LABELS[meal.slot]}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${tierBadgeStyle(
                          viability.tier
                        )}`}
                      >
                        {viability.tier}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                      {meal.label}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
                      {meal.proteinG}g P · {meal.kcal} kcal
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedDay === todayWeekday && (
                      <button
                        onClick={() => handleLogPlannedMeal(meal)}
                        className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                          isLoggedToday
                            ? "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/35"
                            : "bg-[#3b6cf6] hover:bg-[#2f5ee5] text-white"
                        }`}
                      >
                        {isLoggedToday ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isLoggedToday ? "Logged" : "Log"}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleRemovePlannedMeal(meal.id)}
                      className="w-8 h-8 rounded-lg bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[#ef4444] flex items-center justify-center"
                      aria-label={`Remove ${meal.label} from ${selectedDay}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Dish to Day */}
          <div className="pt-1">
            {!pickerOpen ? (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full h-10 rounded-xl bg-[var(--surface-0)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-medium text-[#60a5fa] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Add dish to {WEEKDAY_ORDER.find((d) => d.key === selectedDay)?.short} plan</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Add to {WEEKDAY_ORDER.find((d) => d.key === selectedDay)?.label}
                  </span>
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1 bg-[var(--surface-1)] p-1 rounded-xl">
                  {(["lunch", "seal", "dinner", "primer"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPickSlot(s)}
                      className={`py-1 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap ${
                        pickSlot === s
                          ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {SLOT_LABELS[s]}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={pickQuery}
                    onChange={(e) => setPickQuery(e.target.value)}
                    placeholder="Search saved or preset dishes..."
                    className="w-full h-9 pl-8 pr-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5">
                  {addableOptions.slice(0, 12).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAddPlannedItem(opt)}
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] flex items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {opt.spot}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-secondary)] shrink-0">
                        {opt.proteinG}g P · {opt.kcal} kcal
                      </span>
                    </button>
                  ))}
                </div>

                {/* Quick custom dish into plan */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customTitle.trim() || !customKcal) return;
                    handleAddPlannedItem({
                      label: customTitle.trim(),
                      kcal: Number(customKcal) || 0,
                      proteinG: Number(customProtein) || 0,
                    });
                  }}
                  className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-12 gap-1.5"
                >
                  <input
                    type="text"
                    placeholder="Custom meal"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="col-span-5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="kcal"
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value)}
                    className="col-span-3 px-2 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[11px] font-mono"
                    required
                  />
                  <input
                    type="number"
                    placeholder="P (g)"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[11px] font-mono"
                  />
                  <button
                    type="submit"
                    className="col-span-2 rounded-lg bg-[#3b6cf6] text-white text-[11px] font-semibold"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
