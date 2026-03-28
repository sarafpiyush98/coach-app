"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { useToastStore } from "@/components/ui/system-toast"
import { playQuestComplete } from "@/lib/sounds"
import { useCacheStore } from "@/lib/cache"

const RATINGS = [1, 2, 3, 4, 5] as const

function RatingPips({
  label,
  value,
  onChange,
  labels,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  labels: string[]
}) {
  return (
    <div>
      <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
        {label}
      </span>
      <div className="grid grid-cols-5 gap-2">
        {RATINGS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
              value === n
                ? "border border-[var(--accent-blue)] text-[var(--text-primary)]"
                : "bg-[var(--surface-2)] text-[var(--text-muted)]"
            }`}
          >
            <span className="font-[family-name:var(--font-geist-mono)] text-lg">{n}</span>
            <span className="font-[family-name:var(--font-rajdhani)] text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
              {labels[n - 1]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.add)
  const [weightKg, setWeightKg] = useState("")
  const [sleepHours, setSleepHours] = useState("")
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [ateAfter10pm, setAteAfter10pm] = useState<boolean | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!sleepHours || sleepQuality === null || energyLevel === null || mood === null || ateAfter10pm === null) return
    setSaving(true)
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(), "yyyy-MM-dd"),
          sleep_hours: Number(sleepHours),
          sleep_quality: sleepQuality,
          energy_level: energyLevel,
          mood,
          ate_after_10pm: ateAfter10pm,
          weight_kg: weightKg ? Number(weightKg) : null,
          notes: notes.trim() || null,
        }),
      })
      playQuestComplete()
      addToast({ title: "SYSTEM DIAGNOSTIC — COMPLETE", variant: "success" })
      useCacheStore.getState().invalidateAll()
      setTimeout(() => router.push("/"), 1000)
    } catch {
      setSaving(false)
    }
  }

  const isValid =
    sleepHours !== "" &&
    sleepQuality !== null &&
    energyLevel !== null &&
    mood !== null &&
    ateAfter10pm !== null

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          System Diagnostic
        </h1>
        <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-muted)] mt-1">
          {format(new Date(), "EEEE, MMM d")}
        </p>
      </div>

      {/* Single form container */}
      <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4 space-y-4">
        {/* Weight */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Weigh-In (optional)
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={300}
              placeholder="120.0"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full h-11 px-3 pr-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
              kg
            </span>
          </div>
        </div>

        {/* Sleep hours */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Rest Duration (hours)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={24}
            placeholder="7.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--text-muted)]/50 focus:border-[var(--border-accent)] focus:outline-none transition-colors"
          />
        </div>

        {/* Ratings */}
        <RatingPips label="Rest Quality" value={sleepQuality} onChange={setSleepQuality} labels={["Poor", "Fair", "OK", "Good", "Peak"]} />
        <RatingPips label="Energy Output" value={energyLevel} onChange={setEnergyLevel} labels={["Low", "Below", "Mid", "High", "Peak"]} />
        <RatingPips label="Mental State" value={mood} onChange={setMood} labels={["Bad", "Meh", "OK", "Good", "Peak"]} />

        {/* Fasting seal */}
        <div>
          <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Fasting Seal
          </span>
          <div className="flex gap-2">
            {([false, true] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setAteAfter10pm(val)}
                className={`h-10 px-4 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                  ateAfter10pm === val
                    ? val
                      ? "border border-[var(--danger)] text-[var(--danger)]"
                      : "border border-[var(--success)] text-[var(--success)]"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                }`}
              >
                {val ? "Seal Broken" : "Seal Intact"}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Notes (optional)
          </label>
          <textarea
            placeholder="Operational notes..."
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
        disabled={!isValid || saving}
        className="w-full h-12 mt-4 rounded-lg bg-[var(--accent-blue)] font-[family-name:var(--font-rajdhani)] text-base font-bold uppercase tracking-[0.15em] text-[var(--surface-0)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {saving ? "Processing..." : "Submit Diagnostic"}
      </motion.button>
    </div>
  )
}
