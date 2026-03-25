"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MEAL_NUMBERS = [1, 2, 3] as const

export default function LogMealPage() {
  const router = useRouter()
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
      router.push("/")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6">
      <h1 className="text-xl font-semibold text-foreground">Log Meal</h1>

      {/* Meal number */}
      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-xs">Meal</Label>
        <div className="grid grid-cols-3 gap-3">
          {MEAL_NUMBERS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMealNumber(n)}
              className={`h-14 rounded-xl text-lg font-semibold transition-colors ${
                mealNumber === n
                  ? "bg-amber-500 text-black"
                  : "bg-card border border-border text-muted-foreground hover:border-amber-500/50"
              }`}
            >
              Meal {n}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-muted-foreground text-xs">
          What did you eat?
        </Label>
        <Input
          id="description"
          placeholder="Grilled chicken bowl from EatFit"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-11 text-base"
        />
      </div>

      {/* Calories + Protein row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calories" className="text-muted-foreground text-xs">
            Calories
          </Label>
          <Input
            id="calories"
            type="number"
            inputMode="numeric"
            placeholder="800"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="protein" className="text-muted-foreground text-xs">
            Protein (g)
          </Label>
          <Input
            id="protein"
            type="number"
            inputMode="numeric"
            placeholder="40"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>

      {/* Eating out toggle */}
      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-xs">Eating out?</Label>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setIsEatingOut(val)}
              className={`h-11 rounded-xl text-sm font-medium transition-colors ${
                isEatingOut === val
                  ? "bg-amber-500 text-black"
                  : "bg-card border border-border text-muted-foreground hover:border-amber-500/50"
              }`}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant name (conditional) */}
      {isEatingOut && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="restaurant" className="text-muted-foreground text-xs">
            Restaurant
          </Label>
          <Input
            id="restaurant"
            placeholder="EatFit, Swiggy, etc."
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      )}

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!mealNumber || !calories || saving}
        className="h-14 mt-2 rounded-xl bg-amber-500 text-black text-lg font-semibold hover:bg-amber-400 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save Meal"}
      </Button>
    </div>
  )
}
