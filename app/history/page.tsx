"use client"

import { useEffect, useState, useCallback } from "react"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isSunday,
  isFuture as isFutureDate,
} from "date-fns"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { SystemPanel } from "@/components/ui/system-panel"
import type { DailyLog, Meal, Workout } from "@/lib/types"

interface DayDetail {
  log: DailyLog
  meals: Meal[]
  workouts: Workout[]
}

type DayStatus = "good" | "ok" | "missed" | "rest" | "future" | "none"

function getDayStatus(log: DailyLog | undefined, date: Date): DayStatus {
  if (isFutureDate(date)) return "future"
  if (isSunday(date) && !log) return "rest"
  if (!log) return "none"
  if (log.meals_logged && log.workout_done) return "good"
  if (log.meals_logged) return "ok"
  return "missed"
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

const QUEST_NAMES: Record<string, string> = {
  fuel_vessel_1: "FUEL THE VESSEL I",
  fuel_vessel_2: "FUEL THE VESSEL II",
  fuel_vessel_3: "FUEL THE VESSEL III",
  movement_protocol: "MOVEMENT PROTOCOL",
  system_diagnostic: "SYSTEM DIAGNOSTIC",
  fasting_seal: "FASTING SEAL",
}

function getQuestStatus(log: DailyLog, meals: Meal[]) {
  const quests: { name: string; complete: boolean }[] = []
  quests.push({ name: QUEST_NAMES.fuel_vessel_1, complete: meals.some((m) => m.meal_number === 1) })
  quests.push({ name: QUEST_NAMES.fuel_vessel_2, complete: meals.some((m) => m.meal_number === 2) })
  quests.push({ name: QUEST_NAMES.fuel_vessel_3, complete: meals.some((m) => m.meal_number === 3) })
  quests.push({ name: QUEST_NAMES.movement_protocol, complete: log.workout_done === true })
  quests.push({ name: QUEST_NAMES.system_diagnostic, complete: log.sleep_hours != null })
  quests.push({ name: QUEST_NAMES.fasting_seal, complete: log.ate_after_10pm === false })
  return quests
}

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [days, setDays] = useState<DailyLog[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchMonth = useCallback(async (month: Date) => {
    setLoading(true)
    setSelectedDate(null)
    setDayDetail(null)
    const start = format(startOfMonth(month), "yyyy-MM-dd")
    const end = format(endOfMonth(month), "yyyy-MM-dd")
    try {
      const res = await fetch(`/api/history?start=${start}&end=${end}`)
      const data = await res.json()
      setDays(Array.isArray(data) ? data : data.days || [])
    } catch {
      setDays([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMonth(currentMonth)
  }, [currentMonth, fetchMonth])

  function handlePrev() {
    setCurrentMonth((m) => subMonths(m, 1))
  }

  function handleNext() {
    setCurrentMonth((m) => addMonths(m, 1))
  }

  async function handleSelectDay(date: Date) {
    if (isFutureDate(date)) return
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null)
      setDayDetail(null)
      return
    }

    setSelectedDate(date)
    setDetailLoading(true)
    const dateStr = format(date, "yyyy-MM-dd")

    const log = days.find((d) => d.date === dateStr)
    if (!log) {
      setDayDetail(null)
      setDetailLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/history?start=${dateStr}&end=${dateStr}`)
      const data = await res.json()
      const dayData = Array.isArray(data) ? data[0] : data.days?.[0]
      setDayDetail({
        log: dayData || log,
        meals: data.meals || [],
        workouts: data.workouts || [],
      })
    } catch {
      setDayDetail({ log, meals: [], workouts: [] })
    }
    setDetailLoading(false)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDayOfWeek = (getDay(monthStart) + 6) % 7
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i)

  const today = new Date()
  const daysInPast = allDays.filter((d) => !isFutureDate(d))
  const daysTracked = days.filter((d) => d.meals_logged || d.workout_done).length
  const daysExercised = days.filter((d) => d.workout_done).length
  const daysWithCalories = days.filter((d) => d.calories_total != null && d.calories_total > 0)
  const avgCalories = daysWithCalories.length > 0
    ? Math.round(daysWithCalories.reduce((sum, d) => sum + (d.calories_total || 0), 0) / daysWithCalories.length)
    : null
  const daysWithProtein = days.filter((d) => d.protein_g != null && d.protein_g > 0)
  const avgProtein = daysWithProtein.length > 0
    ? Math.round(daysWithProtein.reduce((sum, d) => sum + (d.protein_g || 0), 0) / daysWithProtein.length)
    : null

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto pt-8 pb-24">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center font-[family-name:var(--font-rajdhani)] text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]"
      >
        Records
      </motion.h1>

      {/* Month Navigator */}
      <SystemPanel className="p-3">
        <div className="flex items-center justify-between">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all"
          >
            <ChevronLeft size={16} />
          </motion.button>
          <span className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all"
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </SystemPanel>

      {/* Calendar Grid */}
      <SystemPanel className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {/* Day-of-week headers */}
          {WEEKDAYS.map((wd, i) => (
            <div
              key={`${wd}-${i}`}
              className="text-center font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] py-1"
            >
              {wd}
            </div>
          ))}

          {/* Padding cells */}
          {paddingDays.map((i) => (
            <div key={`pad-${i}`} className="w-10 h-10" />
          ))}

          {/* Day cells — 40x40 with 4px gap */}
          {allDays.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd")
            const log = days.find((d) => d.date === dateStr)
            const status = getDayStatus(log, date)
            const isToday = isSameDay(date, today)
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isFuture = isFutureDate(date)

            return (
              <motion.button
                key={dateStr}
                type="button"
                whileTap={!isFuture ? { scale: 0.9 } : undefined}
                onClick={() => handleSelectDay(date)}
                disabled={isFuture}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all ${
                  // Today: filled accent bg
                  isToday && !isSelected
                    ? "bg-[var(--accent-blue)] text-white"
                    : ""
                } ${
                  // Selected: accent border
                  isSelected
                    ? "border-2 border-[var(--accent-blue)]"
                    : ""
                } ${
                  // Background based on status (not today, not selected)
                  !isToday && !isSelected
                    ? status === "good"
                      ? "bg-[var(--accent-blue)]/30"
                      : status === "ok"
                        ? "bg-[var(--surface-2)]"
                        : status === "rest"
                          ? "bg-[var(--surface-1)]/50"
                          : status === "future"
                            ? "bg-transparent"
                            : ""
                    : ""
                } ${isFuture ? "cursor-default" : "cursor-pointer hover:bg-[var(--surface-2)]"}`}
              >
                <span
                  className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
                    isToday
                      ? "text-white font-semibold"
                      : status === "good"
                        ? "text-[var(--text-primary)] font-semibold"
                        : status === "future"
                          ? "text-[var(--text-muted)]/40"
                          : status === "rest"
                            ? "text-[var(--text-muted)]/60"
                            : "text-[var(--text-primary)]"
                  }`}
                >
                  {format(date, "d")}
                </span>
                {status === "missed" && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--danger)]/60" />
                )}
              </motion.button>
            )
          })}
        </div>
      </SystemPanel>

      {/* Day Detail */}
      {selectedDate && (
        <SystemPanel className="p-4">
          {detailLoading ? (
            <p className="font-[family-name:var(--font-rajdhani)] text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Loading...
            </p>
          ) : !dayDetail?.log ? (
            <div>
              <h3 className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-primary)] mb-3">
                {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              <p className="font-[family-name:var(--font-rajdhani)] text-xs uppercase tracking-widest text-[var(--text-muted)]">
                No data recorded
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Date header */}
              <h3 className="font-[family-name:var(--font-rajdhani)] text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">
                {format(selectedDate, "MMMM d, yyyy")}
              </h3>

              {/* Quest completion status */}
              <div className="flex flex-col gap-1.5">
                {getQuestStatus(dayDetail.log, dayDetail.meals).map((quest) => (
                  <div key={quest.name} className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]/80">
                      {quest.name}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest ${
                        quest.complete ? "text-[var(--success)]" : "text-[var(--danger)]/60"
                      }`}
                    >
                      {quest.complete ? "COMPLETE" : "INCOMPLETE"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Meals */}
              {dayDetail.meals.length > 0 && (
                <div>
                  <h4 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Fuel Logged
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {dayDetail.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--accent-blue)]">
                            M{meal.meal_number}
                          </span>
                          <span className="text-[var(--text-primary)]/80 text-xs">
                            {meal.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {meal.calories != null && (
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                              {meal.calories} cal
                            </span>
                          )}
                          {meal.protein_g != null && meal.protein_g > 0 && (
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                              {meal.protein_g}g
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {dayDetail.meals.length > 0 && dayDetail.log.workout_done && (
                <div className="border-t border-[var(--border-subtle)]" />
              )}

              {/* Workout */}
              {dayDetail.log.workout_done && (
                <div>
                  <h4 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Movement Executed
                  </h4>
                  {dayDetail.workouts.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {dayDetail.workouts.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="font-[family-name:var(--font-rajdhani)] text-[11px] font-bold uppercase text-[var(--text-primary)]/80">
                            {w.type.replace("_", " ")}
                          </span>
                          {w.duration_minutes != null && (
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--text-muted)]">
                              {w.duration_minutes} min
                            </span>
                          )}
                          {w.notes && (
                            <span className="text-[var(--text-muted)] text-[10px] truncate">
                              {w.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-primary)]/60">
                      {dayDetail.log.workout_type
                        ? `${dayDetail.log.workout_type} — ${dayDetail.log.workout_minutes || "?"} min`
                        : "Workout completed"}
                    </p>
                  )}
                </div>
              )}

              {/* Check-in data */}
              {(dayDetail.log.sleep_hours != null || dayDetail.log.mood != null || dayDetail.log.energy_level != null) && (
                <>
                  <div className="border-t border-[var(--border-subtle)]" />
                  <div>
                    <h4 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Diagnostics
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {dayDetail.log.sleep_hours != null && (
                        <div className="text-center">
                          <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                            {dayDetail.log.sleep_hours}h
                          </span>
                          <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            Sleep
                          </p>
                        </div>
                      )}
                      {dayDetail.log.mood != null && (
                        <div className="text-center">
                          <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                            {dayDetail.log.mood}/5
                          </span>
                          <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            Mood
                          </p>
                        </div>
                      )}
                      {dayDetail.log.energy_level != null && (
                        <div className="text-center">
                          <span className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                            {dayDetail.log.energy_level}/5
                          </span>
                          <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            Energy
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Late eating flag */}
              {dayDetail.log.ate_after_10pm && (
                <div className="px-2 py-1.5 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/20">
                  <span className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--danger)]">
                    Fasting Seal Broken
                  </span>
                </div>
              )}

              {/* Notes */}
              {dayDetail.log.notes && (
                <div>
                  <h4 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-[var(--text-primary)]/60 whitespace-pre-wrap">
                    {dayDetail.log.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SystemPanel>
      )}

      {/* Monthly Summary */}
      <SystemPanel className="p-4">
        <h3 className="font-[family-name:var(--font-rajdhani)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Monthly Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
              {daysTracked}
            </span>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-muted)]">
              /{daysInPast.length}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Days Tracked
            </p>
          </div>
          <div>
            <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
              {daysExercised}
            </span>
            <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Days Exercised
            </p>
          </div>
          {avgCalories != null && (
            <div>
              <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {avgCalories}
              </span>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Avg Calories
              </p>
            </div>
          )}
          {avgProtein != null && (
            <div>
              <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {avgProtein}g
              </span>
              <p className="font-[family-name:var(--font-rajdhani)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Avg Protein
              </p>
            </div>
          )}
        </div>
      </SystemPanel>
    </div>
  )
}
