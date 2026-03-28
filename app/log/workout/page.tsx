"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { SystemPanel } from "@/components/ui/system-panel"
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
      <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6 pb-24">
        <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-[0.15em] text-[#FBEFFA]">
          Movement Protocol
        </h1>
        <SystemPanel className="p-4">
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-3">
            Select Protocol
          </span>
          <div className="grid grid-cols-2 gap-3">
            {WORKOUT_TYPES.map((t, i) => (
              <motion.button
                key={t}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setWorkoutType(t)}
                className="h-16 rounded-lg bg-[#0D1117] border border-[#1A1A2E] font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[#4A5568] hover:border-[#1B45D7]/30 hover:text-[#FBEFFA] transition-all"
              >
                {t}
              </motion.button>
            ))}
          </div>
        </SystemPanel>
      </div>
    )
  }

  // Step 2: details
  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6 pb-24">
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setWorkoutType(null)}
          className="text-[#4A5568] hover:text-[#FBEFFA] transition-colors"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-[0.15em] text-[#FBEFFA]">
          {workoutType}
        </h1>
      </div>

      {/* Strength: exercise list */}
      {isStrength && (
        <SystemPanel className="p-4">
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-3">
            Exercises
          </span>
          <div className="flex flex-col gap-2">
            {PRESET_EXERCISES.map((name) => {
              const idx = exercises.findIndex((e) => e.exercise_name === name)
              const isActive = idx >= 0
              const isExpanded = expandedIndex === idx

              return (
                <div key={name} className="flex flex-col">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleExercise(name)}
                    className={`h-12 rounded-lg text-sm font-[family-name:var(--font-rajdhani)] font-bold uppercase tracking-wider text-left px-4 transition-all ${
                      isActive
                        ? "bg-[#1B45D7]/20 border border-[#1B45D7]/50 text-[#FBEFFA]"
                        : "bg-[#0D1117] border border-[#1A1A2E] text-[#4A5568] hover:border-[#1B45D7]/30"
                    }`}
                  >
                    {name}
                    {isActive && (
                      <span className="text-[10px] text-[#1B45D7] ml-2 font-[family-name:var(--font-geist-mono)] normal-case">
                        {exercises[idx].sets && exercises[idx].reps
                          ? `${exercises[idx].sets}x${exercises[idx].reps} @ ${exercises[idx].weight_kg || 0}kg`
                          : "tap to edit"}
                      </span>
                    )}
                  </motion.button>
                  {isActive && isExpanded && (
                    <div className="mt-1 p-3 rounded-lg bg-[#0D1117] border border-[#1B45D7]/20">
                      <div className="grid grid-cols-3 gap-2">
                        {(["weight_kg", "reps", "sets"] as const).map((field) => (
                          <div key={field} className="flex flex-col gap-1">
                            <span className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[#4A5568]">
                              {field === "weight_kg" ? "Weight (kg)" : field === "reps" ? "Reps" : "Sets"}
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder={field === "weight_kg" ? "100" : field === "reps" ? "10" : "3"}
                              value={exercises[idx][field]}
                              onChange={(e) => updateExercise(idx, field, e.target.value)}
                              className="h-10 px-2 rounded-lg bg-[#0A1543] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExercise(idx)}
                        className="mt-2 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#D50000] hover:text-[#FF5252]"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SystemPanel>
      )}

      {/* Duration */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Duration (minutes)
        </label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="45"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
        />
      </SystemPanel>

      {/* Notes */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Notes (optional)
        </label>
        <textarea
          placeholder="How did it feel?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[60px] px-3 py-2 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-sm placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors resize-none"
        />
      </SystemPanel>

      {/* Submit */}
      <SystemPanel
        className={`p-0 overflow-hidden ${!duration || saving ? "opacity-40" : ""}`}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!duration || saving}
          className="w-full h-14 font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.15em] text-[#FBEFFA] bg-transparent cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Executing..." : "Execute Protocol"}
        </motion.button>
      </SystemPanel>
    </div>
  )
}
