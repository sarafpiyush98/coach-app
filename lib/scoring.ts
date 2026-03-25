import type { DailyLog } from "./types";

export interface WeekData {
  daysTracked: number;
  daysExercised: number;
  daysAteLate: number;
  daysOnTarget: number; // within 10% of 2000 cal
  daysProteinMet: number; // >= 150g
}

const CALORIE_TARGET = 2000;
const PROTEIN_TARGET = 150;

export function calculateWeekData(logs: DailyLog[]): WeekData {
  let daysTracked = 0;
  let daysExercised = 0;
  let daysAteLate = 0;
  let daysOnTarget = 0;
  let daysProteinMet = 0;

  for (const log of logs) {
    if (log.meals_logged) daysTracked++;
    if (log.workout_done) daysExercised++;
    if (log.ate_after_10pm) daysAteLate++;
    if (
      log.calories_total &&
      Math.abs(log.calories_total - CALORIE_TARGET) <= CALORIE_TARGET * 0.1
    ) {
      daysOnTarget++;
    }
    if (log.protein_g && log.protein_g >= PROTEIN_TARGET) {
      daysProteinMet++;
    }
  }

  return { daysTracked, daysExercised, daysAteLate, daysOnTarget, daysProteinMet };
}

export function calculateWeekScore(data: WeekData): number {
  let score = 0;
  score += (data.daysTracked / 7) * 30;
  score += (Math.min(data.daysExercised, 5) / 5) * 25;
  score += ((7 - data.daysAteLate) / 7) * 20;
  score += (data.daysOnTarget / 7) * 15;
  score += (data.daysProteinMet / 7) * 10;
  return Math.round(score);
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Perfect", color: "text-green-400" };
  if (score >= 70) return { label: "Great", color: "text-amber-400" };
  if (score >= 50) return { label: "Decent", color: "text-yellow-500" };
  if (score >= 30) return { label: "Rough", color: "text-orange-500" };
  return { label: "Off track", color: "text-red-500" };
}
