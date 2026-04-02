"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, ChevronLeft, Check, ArrowRight, Dumbbell, Flame, Zap, Waves, Footprints, Activity } from "lucide-react"
import { SystemFrame } from "@/components/ui/system-frame"
import { SystemPanel } from "@/components/ui/system-panel"
import { useToastStore } from "@/components/ui/system-toast"
import { playQuestComplete, playLevelUp } from "@/lib/sounds"
import { useCacheStore } from "@/lib/cache"
import type { PrescribedExercise, PrescribedWorkout, WarmupSet } from "@/lib/workout-engine"

// ============================================================
// Types
// ============================================================

interface SetLog {
  setNumber: number
  setType: "warmup" | "working"
  targetReps: number
  targetWeight: number
  actualReps: number
  actualWeight: number
  logged: boolean
  isPR: boolean
}

// ============================================================
// Rest Timer Component
// ============================================================

function RestTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          // Vibrate on completion
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([200, 100, 400])
          }
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [seconds, onComplete])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        REST
      </span>
      <span className="font-[family-name:var(--font-geist-mono)] text-5xl font-bold tabular-nums text-[var(--accent-blue)]">
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  )
}

// ============================================================
// Cardio Timer
// ============================================================

function CardioTimer({ targetMinutes }: { targetMinutes: number }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetSeconds = targetMinutes * 60

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= targetSeconds) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setRunning(false)
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 400])
            }
          }
          return next
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, targetSeconds])

  const remaining = Math.max(targetSeconds - elapsed, 0)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const done = elapsed >= targetSeconds

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-[family-name:var(--font-geist-mono)] text-5xl font-bold tabular-nums text-[var(--accent-blue)]">
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
      {!running && !done && (
        <button
          onClick={() => setRunning(true)}
          className="h-12 px-8 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] transition-opacity"
        >
          {elapsed > 0 ? "Resume" : "Start Timer"}
        </button>
      )}
      {running && (
        <button
          onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current) }}
          className="h-12 px-8 rounded-lg bg-[var(--surface-2)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] transition-opacity"
        >
          Pause
        </button>
      )}
      {done && (
        <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--success)]">
          SESSION COMPLETE
        </span>
      )}
    </div>
  )
}

// ============================================================
// Exercise Card (one per exercise, full-screen focus)
// ============================================================

function ExerciseCard({
  exercise,
  exerciseIndex,
  totalExercises,
  date,
  onComplete,
}: {
  exercise: PrescribedExercise
  exerciseIndex: number
  totalExercises: number
  date: string
  onComplete: () => void
}) {
  const addToast = useToastStore((s) => s.add)
  const [showCues, setShowCues] = useState(exerciseIndex === 0)
  const [resting, setResting] = useState(false)

  // Build set list: warmups + working
  const buildInitialSets = (): SetLog[] => {
    const sets: SetLog[] = []
    exercise.warmupSets.forEach((w, i) => {
      sets.push({
        setNumber: i + 1,
        setType: "warmup",
        targetReps: w.reps,
        targetWeight: w.weight,
        actualReps: w.reps,
        actualWeight: w.weight,
        logged: false,
        isPR: false,
      })
    })
    for (let i = 0; i < exercise.targetSets; i++) {
      sets.push({
        setNumber: i + 1,
        setType: "working",
        targetReps: exercise.targetReps,
        targetWeight: exercise.targetWeight,
        actualReps: exercise.targetReps,
        actualWeight: exercise.targetWeight,
        logged: false,
        isPR: false,
      })
    }
    return sets
  }

  const [sets, setSets] = useState<SetLog[]>(buildInitialSets)
  const currentSetIdx = sets.findIndex((s) => !s.logged)
  const allLogged = currentSetIdx === -1

  const logSet = async (idx: number) => {
    const s = sets[idx]
    try {
      const res = await fetch("/api/log-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          exerciseName: exercise.name,
          setNumber: s.setNumber,
          setType: s.setType,
          targetReps: s.targetReps,
          targetWeight: s.targetWeight,
          actualReps: s.actualReps,
          actualWeight: s.actualWeight,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast({ title: "SET LOG FAILED", message: err.error || "The System encountered an error.", variant: "danger" })
        return
      }
      const result = await res.json()
      const isPR = result.data?.isPR ?? false

      setSets((prev) =>
        prev.map((set, i) =>
          i === idx ? { ...set, logged: true, isPR } : set
        )
      )

      if (isPR) {
        playLevelUp()
        addToast({
          title: `NEW RECORD — ${exercise.name.toUpperCase()}`,
          variant: "success",
        })
      } else {
        playQuestComplete()
      }

      // Start rest timer if more sets remain
      const nextUnlogged = sets.findIndex((set, i) => i > idx && !set.logged)
      if (nextUnlogged !== -1) {
        setResting(true)
      }
    } catch {
      addToast({ title: "NETWORK ERROR", message: "Connection lost. Try again.", variant: "danger" })
    }
  }

  const updateSetField = (idx: number, field: "actualReps" | "actualWeight", value: number) => {
    setSets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    )
  }

  const warmupSets = sets.filter((s) => s.setType === "warmup")
  const workingSets = sets.filter((s) => s.setType === "working")

  return (
    <SystemFrame className="min-h-[60vh]">
      {/* Header */}
      <div className="mb-4">
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)]">
          EXERCISE {exerciseIndex + 1} OF {totalExercises}
        </span>
        <h2 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-wider text-[var(--text-primary)] mt-1">
          {exercise.name}
        </h2>
      </div>

      {/* Target + Progression */}
      <div className="border-t border-b border-[var(--border-subtle)] py-3 mb-4 space-y-1">
        <div className="flex gap-4">
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-12">TARGET</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-primary)]">
            {exercise.targetSets} x {exercise.targetReps} @ {exercise.targetWeight} kg
          </span>
        </div>
        {exercise.lastSession && (
          <div className="flex gap-4">
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-12">LAST</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-secondary)]">
              {exercise.lastSession.weight} kg {exercise.lastSession.completedAllSets ? "✓" : "✗"} → {exercise.progression}
            </span>
          </div>
        )}
      </div>

      {/* Form Cues — collapsible */}
      {exercise.formCues.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowCues(!showCues)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">
              Form Cues
            </span>
            {showCues ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showCues && (
            <ul className="mt-2 space-y-1">
              {exercise.formCues.map((cue, i) => (
                <li key={i} className="text-[13px] text-[var(--text-muted)] pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--text-muted)]/40">
                  {cue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Rest Timer */}
      {resting && (
        <RestTimer
          seconds={exercise.restSeconds}
          onComplete={() => setResting(false)}
        />
      )}

      {/* Warm-up Sets */}
      {warmupSets.length > 0 && !resting && (
        <div className="mb-4">
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            WARM-UP
          </span>
          {warmupSets.map((s, i) => {
            const globalIdx = i
            const isCurrentSet = globalIdx === currentSetIdx
            return (
              <div key={`w-${i}`} className={`flex items-center gap-3 py-2 ${s.logged ? "opacity-50" : ""}`}>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)] w-6">W{i + 1}</span>
                <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-secondary)]">
                  {s.targetWeight} kg x {s.targetReps}
                </span>
                <div className="flex-1" />
                {s.logged ? (
                  <Check size={16} className="text-[var(--success)]" />
                ) : isCurrentSet ? (
                  <button
                    onClick={() => logSet(globalIdx)}
                    className="h-8 px-4 rounded-lg bg-[var(--surface-2)] font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    Done
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Working Sets */}
      {!resting && (
        <div>
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            WORKING SETS
          </span>
          {workingSets.map((s, i) => {
            const globalIdx = warmupSets.length + i
            const isCurrentSet = globalIdx === currentSetIdx
            return (
              <div key={`s-${i}`} className={`flex items-center gap-3 py-2.5 ${s.logged ? "opacity-50" : ""}`}>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)] w-6">S{i + 1}</span>
                {s.logged ? (
                  <>
                    <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-secondary)]">
                      {s.actualWeight} kg x{" "}
                      <span className={s.actualReps < s.targetReps ? "text-[var(--warning)]" : ""}>
                        {s.actualReps}
                      </span>
                    </span>
                    <div className="flex-1" />
                    {s.isPR && (
                      <span className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-wider text-[var(--warning)]">PR</span>
                    )}
                    <Check size={16} className="text-[var(--success)]" />
                  </>
                ) : isCurrentSet ? (
                  <>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={s.actualWeight}
                      onChange={(e) => updateSetField(globalIdx, "actualWeight", Number(e.target.value))}
                      className="w-16 h-9 px-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
                    />
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">kg x</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={s.actualReps}
                      onChange={(e) => updateSetField(globalIdx, "actualReps", Number(e.target.value))}
                      className="w-14 h-9 px-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
                    />
                    <div className="flex-1" />
                    <button
                      onClick={() => logSet(globalIdx)}
                      className="h-9 px-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-[var(--surface-0)] transition-opacity"
                    >
                      Log Set
                    </button>
                  </>
                ) : (
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-muted)]/40">
                    {s.targetWeight} kg x {s.targetReps}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Next button */}
      {allLogged && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onComplete}
          className="w-full h-12 mt-6 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] flex items-center justify-center gap-2 transition-opacity"
        >
          Next <ArrowRight size={16} />
        </motion.button>
      )}
    </SystemFrame>
  )
}

// ============================================================
// Bodyweight Circuit Data
// ============================================================

const BODYWEIGHT_CIRCUIT = [
  { name: "Push-Ups", targetSets: 3, targetReps: 15, restSeconds: 60, formCues: ["Chest to floor", "Elbows at 45\u00B0"], isTime: false },
  { name: "Bodyweight Squats", targetSets: 3, targetReps: 20, restSeconds: 60, formCues: ["Below parallel", "Knees track toes"], isTime: false },
  { name: "Lunges", targetSets: 3, targetReps: 12, restSeconds: 60, formCues: ["Step far enough", "Rear knee near floor"], isTime: false },
  { name: "Plank Hold", targetSets: 3, targetReps: 30, restSeconds: 45, formCues: ["Hips level", "Core engaged"], isTime: true },
  { name: "Mountain Climbers", targetSets: 3, targetReps: 20, restSeconds: 60, formCues: ["Fast pace", "Core tight"], isTime: false },
]

// ============================================================
// Bodyweight Workout Component
// ============================================================

function BodyweightWorkout({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const addToast = useToastStore((s) => s.add)
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [resting, setResting] = useState(false)
  const [restTime, setRestTime] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(Date.now())

  const exercise = BODYWEIGHT_CIRCUIT[exerciseIdx]
  const allExercisesDone = exerciseIdx >= BODYWEIGHT_CIRCUIT.length

  // Rest countdown
  useEffect(() => {
    if (!resting || restTime <= 0) return
    const t = setTimeout(() => setRestTime((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resting, restTime])

  // Stop resting when timer hits 0
  useEffect(() => {
    if (resting && restTime <= 0) {
      setResting(false)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 400])
      }
    }
  }, [resting, restTime])

  const handleCompleteSet = () => {
    playQuestComplete()
    if (currentSet >= exercise.targetSets) {
      // Move to next exercise
      const nextIdx = exerciseIdx + 1
      if (nextIdx >= BODYWEIGHT_CIRCUIT.length) {
        setCompleted(true)
      } else {
        setExerciseIdx(nextIdx)
        setCurrentSet(1)
      }
    } else {
      // Start rest, then next set
      setResting(true)
      setRestTime(exercise.restSeconds)
      setCurrentSet((s) => s + 1)
    }
  }

  const handleLogSession = async () => {
    if (saving) return
    setSaving(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          type: "other",
          duration_minutes: Math.round((Date.now() - startTime) / 60000),
          notes: "Bodyweight circuit",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast({ title: "LOG FAILED", message: err.error || "The System encountered an error.", variant: "danger" })
        setSaving(false)
        return
      }
      await fetch("/api/complete-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      })
      playQuestComplete()
      addToast({ title: "BODYWEIGHT PROTOCOL — COMPLETE", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      addToast({ title: "NETWORK ERROR", message: "Connection lost. Try again.", variant: "danger" })
      setSaving(false)
    }
  }

  if (completed || allExercisesDone) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-8 pb-24">
        <button onClick={onBack} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ChevronLeft size={16} />
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        <SystemFrame>
          <div className="text-center py-8 space-y-4">
            <h1 className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
              ALL PROTOCOLS EXECUTED.
            </h1>
            <p className="font-[family-name:var(--font-rajdhani)] text-sm uppercase tracking-wider text-[var(--text-muted)]">
              The System has recorded this session.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleLogSession}
              disabled={saving}
              className="w-full h-12 mt-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] disabled:opacity-40 transition-opacity"
            >
              {saving ? "Processing..." : "LOG SESSION"}
            </motion.button>
          </div>
        </SystemFrame>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-8 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <ChevronLeft size={16} />
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
      </button>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-2">
        {BODYWEIGHT_CIRCUIT.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === exerciseIdx
                ? "bg-[var(--accent-blue)]"
                : i < exerciseIdx
                  ? "bg-[var(--success)]"
                  : "bg-[var(--surface-3)]"
            }`}
          />
        ))}
      </div>

      <SystemFrame className="min-h-[50vh]">
        <div className="mb-4">
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-muted)]">
            EXERCISE {exerciseIdx + 1} OF {BODYWEIGHT_CIRCUIT.length}
          </span>
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-wider text-[var(--text-primary)] mt-1">
            {exercise.name}
          </h2>
        </div>

        <div className="border-t border-b border-[var(--border-subtle)] py-3 mb-4">
          <div className="flex gap-4">
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-12">TARGET</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-primary)]">
              {exercise.targetSets} x {exercise.targetReps}{exercise.isTime ? "s" : " reps"}
            </span>
          </div>
        </div>

        {/* Form Cues */}
        {exercise.formCues.length > 0 && (
          <div className="mb-4">
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              FORM CUES
            </span>
            <ul className="space-y-1">
              {exercise.formCues.map((cue, i) => (
                <li key={i} className="text-[13px] text-[var(--text-muted)] pl-3 relative before:content-['\2022'] before:absolute before:left-0 before:text-[var(--text-muted)]/40">
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rest Timer */}
        {resting && (
          <div className="flex flex-col items-center gap-1 py-3">
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              REST
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-5xl font-bold tabular-nums text-[var(--accent-blue)]">
              {Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Set tracker */}
        {!resting && (
          <div className="text-center py-6 space-y-4">
            <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              SET {currentSet} / {exercise.targetSets}
            </span>
            <div className="font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-[var(--text-primary)]">
              {exercise.targetReps}{exercise.isTime ? "s" : " reps"}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCompleteSet}
              className="w-full h-12 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] transition-opacity"
            >
              COMPLETE SET
            </motion.button>
          </div>
        )}
      </SystemFrame>
    </div>
  )
}

// ============================================================
// Free Movement Data & Component
// ============================================================

const FREE_ACTIVITIES = [
  { type: "badminton", label: "Badminton", Icon: Activity },
  { type: "swim", label: "Swim", Icon: Waves },
  { type: "walk", label: "Walk", Icon: Footprints },
  { type: "other", label: "Other", Icon: Zap },
] as const

function FreeMovement({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const addToast = useToastStore((s) => s.add)
  const [selectedType, setSelectedType] = useState<string>("badminton")
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (saving || !duration) return
    setSaving(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          type: selectedType,
          duration_minutes: Number(duration),
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast({ title: "LOG FAILED", message: err.error || "The System encountered an error.", variant: "danger" })
        setSaving(false)
        return
      }
      await fetch("/api/complete-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      })
      playQuestComplete()
      addToast({ title: "FREE MOVEMENT — LOGGED", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      addToast({ title: "NETWORK ERROR", message: "Connection lost. Try again.", variant: "danger" })
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-8 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <ChevronLeft size={16} />
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
      </button>

      <SystemFrame>
        <h2 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
          Free Movement
        </h2>

        {/* Activity selector */}
        <div className="mb-6">
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            ACTIVITY
          </span>
          <div className="grid grid-cols-4 gap-2">
            {FREE_ACTIVITIES.map(({ type, label, Icon }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${
                  selectedType === type
                    ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                    : "border-[var(--border-subtle)] bg-[var(--surface-2)]"
                }`}
              >
                <Icon size={18} className={selectedType === type ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)]"} />
                <span className={`font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-wider ${
                  selectedType === type ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            DURATION
          </span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="0"
              className="w-24 h-10 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
            />
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">minutes</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
            NOTES (OPTIONAL)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] focus:border-[var(--border-accent)] focus:outline-none resize-none"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={saving || !duration}
          className="w-full h-12 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] disabled:opacity-40 transition-opacity"
        >
          {saving ? "Logging..." : "LOG SESSION"}
        </motion.button>
      </SystemFrame>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function LogWorkoutPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.add)
  const [mode, setMode] = useState<"select" | "prescribed" | "bodyweight" | "free">("select")
  const [prescription, setPrescription] = useState<PrescribedWorkout | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentExercise, setCurrentExercise] = useState(0)
  const [completing, setCompleting] = useState(false)

  // Cardio state
  const [cardioDuration, setCardioDuration] = useState("")
  const [cardioIncline, setCardioIncline] = useState("")
  const [cardioSpeed, setCardioSpeed] = useState("")
  const [cardioSaving, setCardioSaving] = useState(false)

  useEffect(() => {
    if (mode !== "prescribed") return
    setLoading(true)
    fetch("/api/workout-prescription")
      .then((r) => r.json())
      .then((res) => {
        const data = res.data
        setPrescription(data)
        // Pre-fill cardio fields
        if (data?.cardioTarget) {
          setCardioDuration(String(data.cardioTarget.duration))
          setCardioIncline(String(data.cardioTarget.incline))
          setCardioSpeed(String(data.cardioTarget.speed))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mode])

  const handleCompleteWorkout = useCallback(async () => {
    if (!prescription || completing) return
    setCompleting(true)
    try {
      const res = await fetch("/api/complete-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: prescription.date }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast({ title: "COMPLETION FAILED", message: err.error || "The System encountered an error.", variant: "danger" })
        setCompleting(false)
        return
      }
      playQuestComplete()
      addToast({ title: "MOVEMENT PROTOCOL — COMPLETE", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      addToast({ title: "NETWORK ERROR", message: "Connection lost. Try again.", variant: "danger" })
      setCompleting(false)
    }
  }, [prescription, completing, addToast, router])

  const handleLogCardio = async () => {
    if (!prescription || cardioSaving) return
    setCardioSaving(true)
    try {
      const res = await fetch("/api/log-cardio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: prescription.date,
          type: "incline_walk",
          durationMinutes: Number(cardioDuration),
          inclinePercent: Number(cardioIncline),
          speedKmh: Number(cardioSpeed),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast({ title: "LOG FAILED", message: err.error || "The System encountered an error.", variant: "danger" })
        setCardioSaving(false)
        return
      }
      playQuestComplete()
      addToast({ title: "MOVEMENT PROTOCOL — COMPLETE", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      addToast({ title: "NETWORK ERROR", message: "Connection lost. Try again.", variant: "danger" })
      setCardioSaving(false)
    }
  }

  // ── MODE: BODYWEIGHT ──
  if (mode === "bodyweight") {
    return <BodyweightWorkout onBack={() => setMode("select")} />
  }

  // ── MODE: FREE ──
  if (mode === "free") {
    return <FreeMovement onBack={() => setMode("select")} />
  }

  // ── MODE: SELECT ──
  if (mode === "select") {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-8 pb-24">
        <h1 className="text-center font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Movement Protocol
        </h1>

        <div className="cursor-pointer" onClick={() => setMode("prescribed")}>
          <SystemPanel className="p-4">
            <div className="flex items-center gap-3">
              <Dumbbell size={20} className="text-[var(--accent-blue)]" />
              <div>
                <p className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Prescribed Protocol
                </p>
                <p className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  System-assigned strength or cardio
                </p>
              </div>
            </div>
          </SystemPanel>
        </div>

        <div className="cursor-pointer" onClick={() => setMode("bodyweight")}>
          <SystemPanel className="p-4">
            <div className="flex items-center gap-3">
              <Flame size={20} className="text-[#EF4444]" />
              <div>
                <p className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Bodyweight Protocol
                </p>
                <p className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  Guided circuit — no equipment required
                </p>
              </div>
            </div>
          </SystemPanel>
        </div>

        <div className="cursor-pointer" onClick={() => setMode("free")}>
          <SystemPanel className="p-4">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-[#22C55E]" />
              <div>
                <p className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Free Movement
                </p>
                <p className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  Badminton, swim, dance, walk — any movement counts
                </p>
              </div>
            </div>
          </SystemPanel>
        </div>
      </div>
    )
  }

  // ── MODE: PRESCRIBED ──

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-[var(--surface-1)] rounded" />
        <div className="h-[400px] bg-[var(--surface-1)] rounded-lg" />
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <button onClick={() => setMode("select")} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ChevronLeft size={16} />
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        <p className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-muted)] text-center py-12">
          No prescription available. Run the workout schema first.
        </p>
      </div>
    )
  }

  const today = format(new Date(), "yyyy-MM-dd")

  // ── REST DAY ──
  if (prescription.type === "rest") {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <button onClick={() => setMode("select")} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ChevronLeft size={16} />
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        <SystemFrame>
          <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-6">
            Rest Protocol
          </h1>
          <div className="border-t border-b border-[var(--border-subtle)] py-6 text-center space-y-3">
            <p className="font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-wider text-[var(--text-primary)]">
              RECOVERY DAY.
            </p>
            <p className="font-[family-name:var(--font-rajdhani)] text-sm uppercase tracking-wider text-[var(--text-muted)]">
              THE SYSTEM DOES NOT ASSIGN MOVEMENT TODAY.
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">
              Your body adapts during rest, not during training.
            </p>
          </div>
        </SystemFrame>
      </div>
    )
  }

  // ── CARDIO DAY ──
  if (prescription.type === "cardio" && prescription.cardioTarget) {
    const target = prescription.cardioTarget
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <button onClick={() => setMode("select")} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
          <ChevronLeft size={16} />
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
        </button>
        <SystemFrame>
          <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            MOVEMENT PROTOCOL — CARDIO
          </span>
          <h2 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-wider text-[var(--text-primary)] mt-1 mb-4">
            INCLINE WALK
          </h2>

          <div className="border-t border-[var(--border-subtle)] pt-4 mb-6">
            <div className="flex gap-4 mb-1">
              <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-12">TARGET</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-primary)]">
                {target.duration} min · {target.incline}% incline · {target.speed} km/h
              </span>
            </div>
          </div>

          {/* Timer */}
          <CardioTimer targetMinutes={target.duration} />

          {/* Editable fields */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-16">Duration</span>
              <input
                type="number"
                inputMode="numeric"
                value={cardioDuration}
                onChange={(e) => setCardioDuration(e.target.value)}
                className="w-20 h-9 px-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
              />
              <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">min</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-16">Incline</span>
              <input
                type="number"
                inputMode="decimal"
                value={cardioIncline}
                onChange={(e) => setCardioIncline(e.target.value)}
                className="w-20 h-9 px-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
              />
              <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-rajdhani)] text-[10px] uppercase tracking-wider text-[var(--text-muted)] w-16">Speed</span>
              <input
                type="number"
                inputMode="decimal"
                value={cardioSpeed}
                onChange={(e) => setCardioSpeed(e.target.value)}
                className="w-20 h-9 px-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-[family-name:var(--font-geist-mono)] text-center focus:border-[var(--border-accent)] focus:outline-none"
              />
              <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)]">km/h</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogCardio}
            disabled={cardioSaving}
            className="w-full h-12 mt-6 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] disabled:opacity-40 transition-opacity"
          >
            {cardioSaving ? "Logging..." : "Log Session"}
          </motion.button>
        </SystemFrame>
      </div>
    )
  }

  // ── STRENGTH DAY ──
  const exercises = prescription.exercises ?? []
  const isLastExercise = currentExercise >= exercises.length

  if (isLastExercise) {
    // All exercises done — show completion
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <SystemFrame>
          <div className="text-center py-8 space-y-4">
            <h1 className="font-[family-name:var(--font-rajdhani)] text-2xl font-bold uppercase tracking-wider text-[var(--text-primary)]">
              ALL PROTOCOLS EXECUTED.
            </h1>
            <p className="font-[family-name:var(--font-rajdhani)] text-sm uppercase tracking-wider text-[var(--text-muted)]">
              The System has recorded this session.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCompleteWorkout}
              disabled={completing}
              className="w-full h-12 mt-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] disabled:opacity-40 transition-opacity"
            >
              {completing ? "Processing..." : "PROTOCOL COMPLETE"}
            </motion.button>
          </div>
        </SystemFrame>
      </div>
    )
  }

  const exercise = exercises[currentExercise]

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      <button onClick={() => setMode("select")} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4">
        <ChevronLeft size={16} />
        <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest">Back</span>
      </button>

      {/* Navigation dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {exercises.map((_, i) => (
          <button
            key={i}
            onClick={() => i < currentExercise && setCurrentExercise(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentExercise
                ? "bg-[var(--accent-blue)]"
                : i < currentExercise
                  ? "bg-[var(--success)]"
                  : "bg-[var(--surface-3)]"
            }`}
          />
        ))}
      </div>

      <ExerciseCard
        key={exercise.name}
        exercise={exercise}
        exerciseIndex={currentExercise}
        totalExercises={exercises.length}
        date={today}
        onComplete={() => setCurrentExercise((prev) => prev + 1)}
      />
    </div>
  )
}
