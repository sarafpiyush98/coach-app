"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { motion } from "framer-motion"
import { SystemPanel } from "@/components/ui/system-panel"
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
    <SystemPanel className="p-4">
      <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
        {label}
      </span>
      <div className="grid grid-cols-5 gap-2">
        {RATINGS.map((n) => (
          <motion.button
            key={n}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(n)}
            className={`h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
              value === n
                ? "bg-[#1B45D7]/30 border border-[#1B45D7] text-[#FBEFFA] shadow-[0_0_12px_rgba(27,69,215,0.3)]"
                : "bg-[#0D1117] border border-[#1A1A2E] text-[#4A5568] hover:border-[#1B45D7]/30"
            }`}
          >
            <span className="font-[family-name:var(--font-geist-mono)] text-lg">{n}</span>
            <span className="font-[family-name:var(--font-rajdhani)] text-[8px] font-bold uppercase tracking-wider leading-none opacity-70">
              {labels[n - 1]}
            </span>
          </motion.button>
        ))}
      </div>
    </SystemPanel>
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
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6 pb-24">
      <div>
        <h1 className="font-[family-name:var(--font-rajdhani)] text-xl font-bold uppercase tracking-[0.15em] text-[#FBEFFA]">
          System Diagnostic
        </h1>
        <p className="font-[family-name:var(--font-rajdhani)] text-xs uppercase tracking-widest text-[#4A5568] mt-1">
          {format(new Date(), "EEEE, MMM d")}
        </p>
      </div>

      {/* Weight */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
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
            className="w-full h-11 px-3 pr-10 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase text-[#4A5568]">
            kg
          </span>
        </div>
      </SystemPanel>

      {/* Sleep hours */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
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
          className="w-full h-11 px-3 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-base font-[family-name:var(--font-geist-mono)] placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors"
        />
      </SystemPanel>

      {/* Sleep quality */}
      <RatingPips
        label="Rest Quality"
        value={sleepQuality}
        onChange={setSleepQuality}
        labels={["Poor", "Fair", "OK", "Good", "Peak"]}
      />

      {/* Energy level */}
      <RatingPips
        label="Energy Output"
        value={energyLevel}
        onChange={setEnergyLevel}
        labels={["Low", "Below", "Mid", "High", "Peak"]}
      />

      {/* Mood */}
      <RatingPips
        label="Mental State"
        value={mood}
        onChange={setMood}
        labels={["Bad", "Meh", "OK", "Good", "Peak"]}
      />

      {/* Fasting seal */}
      <SystemPanel className="p-4">
        <span className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Fasting Seal
        </span>
        <div className="grid grid-cols-2 gap-3">
          {([false, true] as const).map((val) => (
            <motion.button
              key={String(val)}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setAteAfter10pm(val)}
              className={`h-12 rounded-lg font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-wider transition-all ${
                ateAfter10pm === val
                  ? val
                    ? "bg-[#D50000]/20 border border-[#D50000]/50 text-[#D50000]"
                    : "bg-[#059669]/20 border border-[#059669]/50 text-[#059669] shadow-[0_0_12px_rgba(5,150,105,0.3)]"
                  : "bg-[#0D1117] border border-[#1A1A2E] text-[#4A5568] hover:border-[#1B45D7]/30"
              }`}
            >
              {val ? "Seal Broken" : "Seal Intact"}
            </motion.button>
          ))}
        </div>
      </SystemPanel>

      {/* Notes */}
      <SystemPanel className="p-4">
        <label className="block font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-2">
          Notes (optional)
        </label>
        <textarea
          placeholder="Operational notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[60px] px-3 py-2 rounded-lg bg-[#0D1117] border border-[#1A1A2E] text-[#FBEFFA] text-sm placeholder:text-[#4A5568]/50 focus:border-[#1B45D7] focus:outline-none transition-colors resize-none"
        />
      </SystemPanel>

      {/* Submit */}
      <SystemPanel
        className={`p-0 overflow-hidden ${!isValid || saving ? "opacity-40" : ""}`}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!isValid || saving}
          className="w-full h-14 font-[family-name:var(--font-rajdhani)] text-lg font-bold uppercase tracking-[0.15em] text-[#FBEFFA] bg-transparent cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? "Processing..." : "Submit Diagnostic"}
        </motion.button>
      </SystemPanel>
    </div>
  )
}
