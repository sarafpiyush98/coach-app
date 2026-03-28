"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { SystemPanel } from "@/components/ui/system-panel"
import { useToastStore } from "@/components/ui/system-toast"
import { playQuestComplete } from "@/lib/sounds"

const MEAL_NUMBERS = [1, 2, 3] as const
const MEAL_LABELS = ["MEAL I", "MEAL II", "MEAL III"] as const

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
      setTimeout(() => router.push("/"), 1000)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6 pb-24">
      <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-[0.15em] text-[#FBEFFA]">
        Fuel the Vessel
      </h1>

      {/* Meal selector */}
      <SystemPanel className="p-4">
        <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Select Objective
        </span>
        <div className="grid grid-cols-3 gap-3">
          {MEAL_NUMBERS.map((n, i) => (
            <motion.button
              key={n}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setMealNumber(n)}
              className={`h-14 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                mealNumber === n
                  ? "bg-[#1B45D7]/30 border border-[#1B45D7] text-[#FBEFFA] shadow-[0_0_12px_rgba(27,69,215,0.4)]"
                  : "bg-[#0D1117] border border-[#1A1A2E] text-[#4A5568] hover:border-[#1B45D7]/30"
              }`}
            >
              {MEAL_LABELS[i]}
            </motion.button>
          ))}
        </div>
      </SystemPanel>

      {/* Description */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Description
        </label>
        <input
          placeholder="Grilled chicken bowl from EatFit"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-sm font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
        />
      </SystemPanel>

      {/* Calories + Protein */}
      <div className="grid grid-cols-2 gap-3">
        <SystemPanel className="p-4">
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
            Calories
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="800"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
          />
        </SystemPanel>
        <SystemPanel className="p-4">
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
            Protein (g)
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="40"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
          />
        </SystemPanel>
      </div>

      {/* Eating out toggle */}
      <SystemPanel className="p-4">
        <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          External Source
        </span>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEatingOut(val)}
              className={`h-11 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                isEatingOut === val
                  ? "bg-[#1B45D7]/30 border border-[#1B45D7] text-[#FBEFFA]"
                  : "bg-[#0D1117] border border-[#1A1A2E] text-[#4A5568] hover:border-[#1B45D7]/30"
              }`}
            >
              {val ? "Affirmative" : "Negative"}
            </motion.button>
          ))}
        </div>
      </SystemPanel>

      {/* Restaurant name */}
      {isEatingOut && (
        <SystemPanel className="p-4">
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
            Source
          </label>
          <input
            placeholder="EatFit, Swiggy, etc."
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-sm font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
          />
        </SystemPanel>
      )}

      {/* Submit */}
      <SystemPanel
        className={`p-0 overflow-hidden ${
          !mealNumber || !calories || saving ? "opacity-40" : ""
        }`}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!mealNumber || !calories || saving}
          className="w-full h-14 font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.15em] text-[#FBEFFA] bg-transparent cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Logging..." : "Log Entry"}
        </motion.button>
      </SystemPanel>
    </div>
  )
}
