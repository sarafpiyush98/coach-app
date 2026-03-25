"use client"

import { useEffect, useState, useCallback } from "react"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DailyLog, Meal, Workout } from "@/lib/types"

interface DayDetail {
  log: DailyLog
  meals: Meal[]
  workouts: Workout[]
}

type DayStatus = "good" | "ok" | "missed" | "none"

function getDayStatus(log: DailyLog | undefined): DayStatus {
  if (!log) return "none"
  if (log.meals_logged && log.workout_done) return "good"
  if (log.meals_logged) return "ok"
  return "missed"
}

const STATUS_DOT: Record<DayStatus, string> = {
  good: "bg-emerald-500",
  ok: "bg-amber-500",
  missed: "bg-red-500/60",
  none: "",
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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

  // Monday-based offset: getDay returns 0=Sun, we want Mon=0
  const startDayOfWeek = (getDay(monthStart) + 6) % 7
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pt-6">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <span className="text-lg">&lsaquo;</span>
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h1>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <span className="text-lg">&rsaquo;</span>
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Full day
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          Logged
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500/60" />
          Missed
        </span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] text-muted-foreground font-medium py-1"
          >
            {wd}
          </div>
        ))}

        {/* Padding cells */}
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {allDays.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd")
          const log = days.find((d) => d.date === dateStr)
          const status = getDayStatus(log)
          const isToday = isSameDay(date, new Date())
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const inMonth = isSameMonth(date, currentMonth)
          const isFuture = date > new Date()

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => !isFuture && handleSelectDay(date)}
              disabled={isFuture}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-sm transition-colors ${
                isSelected
                  ? "ring-2 ring-amber-500 bg-amber-500/10"
                  : isToday
                    ? "bg-card border border-amber-500/30"
                    : "hover:bg-card/50"
              } ${!inMonth || isFuture ? "opacity-30" : ""} ${
                isFuture ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span
                className={`tabular-nums ${
                  isToday ? "text-amber-400 font-semibold" : "text-foreground"
                }`}
              >
                {format(date, "d")}
              </span>
              {status !== "none" && !isFuture && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Expanded day detail */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {format(selectedDate, "EEEE, MMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !dayDetail?.log ? (
              <p className="text-sm text-muted-foreground">
                No data logged for this day.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {dayDetail.log.calories_total != null && (
                    <div className="text-center">
                      <span className="text-lg font-bold text-amber-400 tabular-nums">
                        {dayDetail.log.calories_total}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        calories
                      </p>
                    </div>
                  )}
                  {dayDetail.log.protein_g != null && (
                    <div className="text-center">
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        {dayDetail.log.protein_g}g
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        protein
                      </p>
                    </div>
                  )}
                  {dayDetail.log.weight_kg != null && (
                    <div className="text-center">
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        {dayDetail.log.weight_kg}
                      </span>
                      <p className="text-[10px] text-muted-foreground">kg</p>
                    </div>
                  )}
                </div>

                {/* Meals */}
                {dayDetail.meals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Meals
                    </h4>
                    <div className="flex flex-col gap-2">
                      {dayDetail.meals.map((meal) => (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              M{meal.meal_number}
                            </Badge>
                            <span className="text-foreground">
                              {meal.description}
                            </span>
                          </div>
                          {meal.calories != null && (
                            <span className="text-muted-foreground tabular-nums text-xs">
                              {meal.calories} cal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workout */}
                {dayDetail.log.workout_done && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Workout
                    </h4>
                    {dayDetail.workouts.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {dayDetail.workouts.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {w.type.replace("_", " ")}
                            </Badge>
                            {w.duration_minutes != null && (
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {w.duration_minutes} min
                              </span>
                            )}
                            {w.notes && (
                              <span className="text-muted-foreground text-xs truncate">
                                {w.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground">
                        {dayDetail.log.workout_type
                          ? `${dayDetail.log.workout_type} - ${dayDetail.log.workout_minutes || "?"} min`
                          : "Workout completed"}
                      </p>
                    )}
                  </div>
                )}

                {/* Sleep + mood row */}
                {(dayDetail.log.sleep_hours != null ||
                  dayDetail.log.mood != null) && (
                  <div className="grid grid-cols-2 gap-3">
                    {dayDetail.log.sleep_hours != null && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">
                          Sleep
                        </h4>
                        <span className="text-sm text-foreground tabular-nums">
                          {dayDetail.log.sleep_hours}h
                        </span>
                        {dayDetail.log.sleep_quality != null && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({dayDetail.log.sleep_quality}/5)
                          </span>
                        )}
                      </div>
                    )}
                    {dayDetail.log.mood != null && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">
                          Mood
                        </h4>
                        <span className="text-sm text-foreground">
                          {dayDetail.log.mood}/5
                        </span>
                        {dayDetail.log.energy_level != null && (
                          <span className="text-muted-foreground text-xs ml-2">
                            Energy: {dayDetail.log.energy_level}/5
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Late eating flag */}
                {dayDetail.log.ate_after_10pm && (
                  <Badge variant="destructive" className="w-fit text-xs">
                    Ate after 10 PM
                  </Badge>
                )}

                {/* Notes */}
                {dayDetail.log.notes && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Notes
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {dayDetail.log.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
