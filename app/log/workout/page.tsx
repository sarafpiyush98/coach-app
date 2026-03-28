"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { useToastStore } from "@/components/ui/system-toast"
import { playQuestComplete } from "@/lib/sounds"
import { useCacheStore } from "@/lib/cache"
import { ChevronLeft } from "lucide-react"

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
  const addToast = useToastStore((s) => s.add)
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null)
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  function toggleExercise(name: string) {
    const idx = exercises.findIndex((e) => e.exercise_name === name)
    if (idx >= 0) {
      setExpandedIndex(expandedIndex === idx ? null : idx)
    } else {
      const newExercises = [...exercises, emptyExercise(name)]
      setExercises(newExercises)
      setExpandedIndex(newExercises.length - 1)
    }
  }

  function updateExercise(idx: number, field: keyof ExerciseEntry, value: string) {
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
      playQuestComplete()
      addToast({ title: "MOVEMENT PROTOCOL — COMPLETE", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      setSaving(false)
    }
  }

  const isStrength = workoutType === "Strength"

  // Step 1: pick type
  if (!workoutType) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-6">
          Movement Protocol
        </h1>
        <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4">
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Select Protocol
          </span>
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWorkoutType(t)}
                className="h-14 rounded-lg bg-[var(--surface-2)] font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: details
  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setWorkoutType(null)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          {workoutType}
        </h1>
      </div>

      <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4 space-y-4">
        {/* Strength: exercise list */}
        {isStrength && (
          <div>
            <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Exercises
            </span>
            <div className="flex flex-col gap-2">
              {PRESET_EXERCISES.map((name) => {
                const idx = exercises.findIndex((e) => e.exercise_name === name)
                const isActive = idx >= 0
                const isExpanded = expandedIndex === idx

                return (
                  <div key={name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleExercise(name)}
                      className={`h-11 rounded-lg text-sm font-[family-name:var(--font-rajdhani)] font-bold uppercase tracking-wider text-left px-4 transition-all ${
                        isActive
                          ? "border border-[var(--accent-blue)] text-[var(--text-primary)]"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {name}
                      {isActive && (
                        <span className="text-[10px] text-[var(--accent-blue)] ml-2 font-[family-name:var(--font-geist-mono)] normal-case">
                          {exercises[idx].sets && exercises[idx].reps
                            ? `${exercises[idx].sets}x${exercises[idx].reps} @ ${exercises[idx].weight_kg || 0}kg`
                            : "tap to edit"}
                        </span>
                      )}
                    </button>
                    {isActive && isExpanded && (
                      <div className="mt-1 p-3 rounded-lg bg-[var(--surface-2)]">
                        <div className="grid grid-cols-3 gap-2">
                          {(["weight_kg", "reps", "sets"] as const).map((field) => (
                            <div key={field} className="flex flex-col gap-1">
                              <span className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                {field === "weight_kg" ? "Weight (kg)" : field === "reps" ? "Reps" : "Sets"}
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder={field === "weight_kg" ? "100" : field === "reps" ? "10" : "3"}
                                value={exercises[idx][field]}
                                onChange={(e) => updateExercise(idx, field, e.target.value)}
                                className="h-10 px-2 rounded-lg bg-[var(--surface-0)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExercise(idx)}
                          className="mt-2 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--danger)] hover:text-[var(--danger)]/80"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Duration */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Notes (optional)
          </label>
          <textarea
            placeholder="How did it feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[60px] px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={!duration || saving}
        className="w-full h-12 mt-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {saving ? "Executing..." : "Execute Protocol"}
      </motion.button>
    </div>
  )
}
