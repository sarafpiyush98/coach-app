"use client"

import { useCachedFetch } from "@/lib/use-cached-fetch"
import { SystemPanel } from "@/components/ui/system-panel"
import { SystemFrame } from "@/components/ui/system-frame"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Flame, Moon, UtensilsCrossed } from "lucide-react"

interface WeeklyReviewData {
  weekStart: string
  weekEnd: string
  grade: string
  gradeScore: number
  thisWeek: { daysTracked: number; daysExercised: number; avgCalories: number | null; avgProtein: number | null; totalXp: number }
  lastWeek: { daysTracked: number; daysExercised: number; avgCalories: number | null; avgProtein: number | null }
  weightDelta: number | null
  bestDay: { date: string; totalXp: number } | null
  streaks: { exercise: number; logging: number; noLateEating: number; exerciseDanger: boolean; loggingDanger: boolean; noLateEatingDanger: boolean }
  consecutiveGoodWeeks: number
  verdict: string
}

const GRADE_COLORS: Record<string, string> = {
  S: "#FFC107",
  A: "#22C55E",
  B: "#1B45D7",
  C: "#A855F7",
  F: "#D50000",
}

function Delta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return <Minus size={10} className="text-[var(--text-muted)]" />
  if (current > previous) return <TrendingUp size={10} className="text-[#22C55E]" />
  if (current < previous) return <TrendingDown size={10} className="text-[#D50000]" />
  return <Minus size={10} className="text-[var(--text-muted)]" />
}

export default function ReviewPage() {
  const { data, loading } = useCachedFetch<WeeklyReviewData>("/api/weekly-review", { maxAge: 60000 })

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pt-8 pb-24">
        <h1 className="text-center font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Weekly Debrief
        </h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-[var(--surface-1)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const gradeColor = GRADE_COLORS[data.grade] ?? GRADE_COLORS.C

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pt-8 pb-24">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]"
      >
        Weekly Debrief
      </motion.h1>

      {/* Grade */}
      <SystemFrame className="p-6 text-center">
        <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Week Grade
        </p>
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-[family-name:var(--font-geist-mono)] text-[72px] font-bold tabular-nums leading-none"
          style={{ color: gradeColor }}
        >
          {data.grade}
        </motion.p>
        <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--text-muted)] mt-2">
          {data.gradeScore}/100
        </p>
      </SystemFrame>

      {/* Comparison Grid */}
      <SystemPanel className="p-4">
        <h3 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          This Week vs Last
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {data.thisWeek.daysTracked}/7
              </span>
              <Delta current={data.thisWeek.daysTracked} previous={data.lastWeek.daysTracked} />
            </div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Days Tracked</p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {data.thisWeek.daysExercised}
              </span>
              <Delta current={data.thisWeek.daysExercised} previous={data.lastWeek.daysExercised} />
            </div>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Days Exercised</p>
          </div>
          {data.thisWeek.avgCalories != null && (
            <div>
              <div className="flex items-center gap-1">
                <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {data.thisWeek.avgCalories}
                </span>
                <Delta current={data.thisWeek.avgCalories} previous={data.lastWeek.avgCalories} />
              </div>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Avg Calories</p>
            </div>
          )}
          {data.thisWeek.avgProtein != null && (
            <div>
              <div className="flex items-center gap-1">
                <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {data.thisWeek.avgProtein}g
                </span>
                <Delta current={data.thisWeek.avgProtein} previous={data.lastWeek.avgProtein} />
              </div>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Avg Protein</p>
            </div>
          )}
        </div>
      </SystemPanel>

      {/* XP + Best Day */}
      <SystemPanel className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
              {data.thisWeek.totalXp}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              XP This Week
            </p>
          </div>
          {data.bestDay && (
            <div className="text-right">
              <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums text-[var(--accent-blue)]">
                {data.bestDay.totalXp}
              </span>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Best Day
              </p>
            </div>
          )}
        </div>
      </SystemPanel>

      {/* Streaks */}
      <SystemPanel className="p-4">
        <h3 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Streak Status
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <Flame size={14} className={`mx-auto mb-1 ${data.streaks.exerciseDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`} />
            <span className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums ${data.streaks.exerciseDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`}>
              {data.streaks.exercise}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Exercise</p>
          </div>
          <div>
            <UtensilsCrossed size={14} className={`mx-auto mb-1 ${data.streaks.loggingDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`} />
            <span className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums ${data.streaks.loggingDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`}>
              {data.streaks.logging}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Logging</p>
          </div>
          <div>
            <Moon size={14} className={`mx-auto mb-1 ${data.streaks.noLateEatingDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`} />
            <span className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums ${data.streaks.noLateEatingDanger ? "text-[#D50000]" : "text-[var(--text-primary)]"}`}>
              {data.streaks.noLateEating}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Fasting</p>
          </div>
        </div>
      </SystemPanel>

      {/* Weight Delta */}
      {data.weightDelta != null && (
        <SystemPanel className="p-4">
          <div className="flex items-center justify-between">
            <p className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Weight Delta
            </p>
            <span className={`font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums ${data.weightDelta <= 0 ? "text-[#22C55E]" : "text-[#D50000]"}`}>
              {data.weightDelta > 0 ? "+" : ""}{data.weightDelta} kg
            </span>
          </div>
        </SystemPanel>
      )}

      {/* System Verdict */}
      <div className="border-l-2 border-[var(--accent-blue)] pl-4 py-2">
        <p className="font-[family-name:var(--font-rajdhani)] text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          {data.verdict}
        </p>
      </div>
    </div>
  )
}
