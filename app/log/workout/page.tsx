"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WORKOUT_TYPES = [
  "Strength",
  "Incline Walk",
  "Walk",
  "Badminton",
  "Swim",
  "Other",
] as const

type WorkoutType = (typeof WORKOUT_TYPES)[number]

const PRESET_EXERCISES = [
  "Leg Press",
  "Incline Bench Press",
  "Lat Pulldown",
  "Rack Pulls",
  "Dumbbell Rows",
] as const

interface ExerciseEntry {
  exercise_name: string
  weight_kg: string
  reps: string
  sets: string
}

function emptyExercise(name: string): ExerciseEntry {
  return { exercise_name: name, weight_kg: "", reps: "", sets: "" }
}

export default function LogWorkoutPage() {
  const router = useRouter()
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null)
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleExercise(name: string) {
    const idx = exercises.findIndex((e) => e.exercise_name === name)
    if (idx >= 0) {
      // Already added -- toggle expand/collapse
      setExpandedIndex(expandedIndex === idx ? null : idx)
    } else {
      // Add and expand
      const newExercises = [...exercises, emptyExercise(name)]
      setExercises(newExercises)
      setExpandedIndex(newExercises.length - 1)
    }
  }

  function updateExercise(
    idx: number,
    field: keyof ExerciseEntry,
    value: string
  ) {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    )
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
    setExpandedIndex(null)
  }

  async function handleSave() {
    if (!workoutType || !duration) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        date: format(new Date(), "yyyy-MM-dd"),
        type: workoutType.toLowerCase(),
        duration_minutes: Number(duration),
        notes,
      }
      if (workoutType === "Strength") {
        payload.exercises = exercises
          .filter((e) => e.sets && e.reps)
          .map((e) => ({
            exercise_name: e.exercise_name,
            sets: Number(e.sets),
            reps: Number(e.reps),
            weight_kg: Number(e.weight_kg) || 0,
          }))
      }
      await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      router.push("/")
    } catch {
      setSaving(false)
    }
  }

  const isStrength = workoutType === "Strength"

  // Step 1: pick type
  if (!workoutType) {
    return (
      <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6">
        <h1 className="text-xl font-semibold text-foreground">Log Workout</h1>
        <Label className="text-muted-foreground text-xs">Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWorkoutType(t)}
              className="h-16 rounded-xl bg-card border border-border text-sm font-medium text-muted-foreground hover:border-amber-500/50 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: details
  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWorkoutType(null)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-semibold text-foreground">{workoutType}</h1>
      </div>

      {/* Strength: exercise list */}
      {isStrength && (
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs">Exercises</Label>
          {PRESET_EXERCISES.map((name) => {
            const idx = exercises.findIndex((e) => e.exercise_name === name)
            const isActive = idx >= 0
            const isExpanded = expandedIndex === idx

            return (
              <div key={name} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleExercise(name)}
                  className={`h-12 rounded-xl text-sm font-medium transition-colors text-left px-4 ${
                    isActive
                      ? "bg-amber-500/20 border border-amber-500/50 text-amber-400"
                      : "bg-card border border-border text-muted-foreground hover:border-amber-500/50"
                  }`}
                >
                  {name}
                  {isActive && (
                    <span className="text-xs text-amber-500/70 ml-2">
                      {exercises[idx].sets && exercises[idx].reps
                        ? `${exercises[idx].sets}x${exercises[idx].reps} @ ${exercises[idx].weight_kg || 0}kg`
                        : "tap to edit"}
                    </span>
                  )}
                </button>
                {isActive && isExpanded && (
                  <Card className="mt-1 border-amber-500/30">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Weight (kg)
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="100"
                            value={exercises[idx].weight_kg}
                            onChange={(e) =>
                              updateExercise(idx, "weight_kg", e.target.value)
                            }
                            className="h-10 text-base"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Reps
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="10"
                            value={exercises[idx].reps}
                            onChange={(e) =>
                              updateExercise(idx, "reps", e.target.value)
                            }
                            className="h-10 text-base"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-muted-foreground text-[10px]">
                            Sets
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="3"
                            value={exercises[idx].sets}
                            onChange={(e) =>
                              updateExercise(idx, "sets", e.target.value)
                            }
                            className="h-10 text-base"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExercise(idx)}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="duration" className="text-muted-foreground text-xs">
          Duration (minutes)
        </Label>
        <Input
          id="duration"
          type="number"
          inputMode="numeric"
          placeholder="45"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="h-11 text-base"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes" className="text-muted-foreground text-xs">
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px] text-base"
        />
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!duration || saving}
        className="h-14 mt-2 rounded-xl bg-amber-500 text-black text-lg font-semibold hover:bg-amber-400 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save Workout"}
      </Button>
    </div>
  )
}
