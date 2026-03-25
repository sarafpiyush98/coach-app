"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const RATINGS = [1, 2, 3, 4, 5] as const

function RatingPills({
  label,
  value,
  onChange,
  labels,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
  labels?: string[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="grid grid-cols-5 gap-2">
        {RATINGS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-12 rounded-xl text-sm font-semibold transition-colors ${
              value === n
                ? "bg-amber-500 text-black"
                : "bg-card border border-border text-muted-foreground hover:border-amber-500/50"
            }`}
          >
            <span className="text-lg">{n}</span>
            {labels?.[n - 1] && (
              <span className="block text-[10px] font-normal leading-tight opacity-70">
                {labels[n - 1]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  const router = useRouter()
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
          notes: notes.trim() || null,
        }),
      })
      router.push("/")
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
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pt-6">
      <h1 className="text-xl font-semibold text-foreground">Daily Check-in</h1>
      <p className="text-sm text-muted-foreground -mt-3">
        End-of-day reflection for {format(new Date(), "EEEE, MMM d")}
      </p>

      {/* Sleep hours */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sleep-hours" className="text-muted-foreground text-xs">
          Hours of sleep
        </Label>
        <Input
          id="sleep-hours"
          type="number"
          inputMode="decimal"
          step={0.5}
          min={0}
          max={24}
          placeholder="7.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          className="h-11 text-base"
        />
      </div>

      {/* Sleep quality */}
      <RatingPills
        label="Sleep quality"
        value={sleepQuality}
        onChange={setSleepQuality}
        labels={["Poor", "Fair", "OK", "Good", "Great"]}
      />

      {/* Energy level */}
      <RatingPills
        label="Energy level"
        value={energyLevel}
        onChange={setEnergyLevel}
        labels={["Low", "Below", "Mid", "High", "Peak"]}
      />

      {/* Mood */}
      <RatingPills
        label="Mood"
        value={mood}
        onChange={setMood}
        labels={["Bad", "Meh", "OK", "Good", "Great"]}
      />

      {/* Ate after 10pm */}
      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-xs">
          Did you eat after 10 PM?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setAteAfter10pm(val)}
              className={`h-11 rounded-xl text-sm font-medium transition-colors ${
                ateAfter10pm === val
                  ? val
                    ? "bg-red-500/80 text-white"
                    : "bg-emerald-500/80 text-white"
                  : "bg-card border border-border text-muted-foreground hover:border-amber-500/50"
              }`}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes" className="text-muted-foreground text-xs">
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="How did the day go? Anything notable?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="text-base"
        />
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!isValid || saving}
        className="h-14 mt-2 rounded-xl bg-amber-500 text-black text-lg font-semibold hover:bg-amber-400 disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save Check-in"}
      </Button>
    </div>
  )
}
