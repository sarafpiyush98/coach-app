"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { useToastStore } from "@/components/ui/system-toast"
import { playQuestComplete } from "@/lib/sounds"
import { useCacheStore } from "@/lib/cache"

const MEAL_NUMBERS = [1, 2, 3] as const
const MEAL_LABELS = ["I", "II", "III"] as const

export default function LogMealPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.add)
  const [mealNumber, setMealNumber] = useState<number | null>(null)
  const [description, setDescription] = useState("")
  const [calories, setCalories] = useState("")
  const [proteinG, setProteinG] = useState("")
  const [isEatingOut, setIsEatingOut] = useState(true)
  const [restaurant, setRestaurant] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!mealNumber || !calories) return
    setSaving(true)
    try {
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(), "yyyy-MM-dd"),
          meal_number: mealNumber,
          description,
          calories: Number(calories),
          protein_g: Number(proteinG) || 0,
          is_eating_out: isEatingOut,
          restaurant: isEatingOut ? restaurant : "",
        }),
      })
      playQuestComplete()
      addToast({ title: "FUEL THE VESSEL — LOGGED", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-6">
        Fuel the Vessel
      </h1>

      {/* Single form container */}
      <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4 space-y-4">
        {/* Meal selector */}
        <div>
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Meal
          </span>
          <div className="flex gap-2">
            {MEAL_NUMBERS.map((n, i) => (
              <button
                key={n}
                type="button"
                onClick={() => setMealNumber(n)}
                className={`h-10 px-5 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                  mealNumber === n
                    ? "border border-[var(--accent-blue)] text-[var(--text-primary)]"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                }`}
              >
                {MEAL_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Description
          </label>
          <input
            placeholder="Grilled chicken bowl from EatFit"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
          />
        </div>

        {/* Calories + Protein */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Calories
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="800"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Protein (g)
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="40"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Eating out toggle */}
        <div>
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            External Source
          </span>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setIsEatingOut(val)}
                className={`h-10 px-4 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                  isEatingOut === val
                    ? "border border-[var(--accent-blue)] text-[var(--text-primary)]"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                }`}
              >
                {val ? "Affirmative" : "Negative"}
              </button>
            ))}
          </div>
        </div>

        {/* Restaurant name */}
        {isEatingOut && (
          <div>
            <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Source
            </label>
            <input
              placeholder="EatFit, Swiggy, etc."
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={!mealNumber || !calories || saving}
        className="w-full h-12 mt-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {saving ? "Logging..." : "Log Entry"}
      </motion.button>
    </div>
  )
}
