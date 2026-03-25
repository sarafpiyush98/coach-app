import { format, subDays, differenceInCalendarDays } from "date-fns";
import type { DailyLog } from "./types";

export interface StreakStatus {
  exercise: number;
  logging: number;
  noLateEating: number;
  exerciseDanger: boolean; // missed 1 day
  loggingDanger: boolean;
  noLateEatingDanger: boolean;
  missedYesterday: boolean;
}

function isMinimumViableDay(log: DailyLog): boolean {
  return log.meals_logged && (log.workout_done || (log.workout_minutes ?? 0) >= 10);
}

export function calculateStreaks(logs: DailyLog[], today: string): StreakStatus {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const logMap = new Map<string, DailyLog>();
  for (const log of sorted) {
    logMap.set(log.date, log);
  }

  const todayDate = new Date(today);
  const yesterdayStr = format(subDays(todayDate, 1), "yyyy-MM-dd");
  const yesterdayLog = logMap.get(yesterdayStr);
  const missedYesterday = !yesterdayLog || !isMinimumViableDay(yesterdayLog);

  function countStreak(
    checkFn: (log: DailyLog) => boolean,
    startDate: Date
  ): { streak: number; danger: boolean } {
    let streak = 0;
    let gapUsed = false;
    let danger = false;

    for (let i = 0; i < 365; i++) {
      const d = format(subDays(startDate, i), "yyyy-MM-dd");
      const log = logMap.get(d);

      if (log && checkFn(log)) {
        streak++;
      } else if (!gapUsed && i > 0) {
        // Never-miss-twice: allow ONE gap
        gapUsed = true;
        danger = true;
      } else {
        break;
      }
    }

    return { streak, danger };
  }

  const exercise = countStreak((l) => l.workout_done, todayDate);
  const logging = countStreak((l) => l.meals_logged, todayDate);
  const noLateEating = countStreak((l) => !l.ate_after_10pm, todayDate);

  return {
    exercise: exercise.streak,
    logging: logging.streak,
    noLateEating: noLateEating.streak,
    exerciseDanger: exercise.danger,
    loggingDanger: logging.danger,
    noLateEatingDanger: noLateEating.danger,
    missedYesterday,
  };
}

export function getStreakMessage(status: StreakStatus): string | null {
  if (status.exerciseDanger || status.loggingDanger) {
    return "You missed yesterday. Today keeps the streak alive. Don't miss twice.";
  }
  return null;
}
