// Daily study targets: how today is going, and how many days in a row they were met.
// Pure functions; targets are saved with study progress (progress.ts).

import { dayKey, type DayActivity, type Progress, type Targets } from "./progress";

export interface TargetStatus {
  goal: number;
  done: number;
  met: boolean;
  /** Share of the goal done, 0 to 1. */
  fraction: number;
}

export interface TodayTargets {
  answers: TargetStatus;
  newKanji: TargetStatus;
  /** False when both targets are turned off. */
  anySet: boolean;
  /** Every target that's set is met. */
  met: boolean;
}

const status = (goal: number, done: number): TargetStatus => ({
  goal,
  done,
  met: goal > 0 && done >= goal,
  fraction: goal > 0 ? Math.min(1, done / goal) : 0,
});

/** Whether a day's activity meets every target that's set. */
export function meetsTargets(targets: Targets, day: DayActivity | undefined): boolean {
  if (targets.answers === 0 && targets.newKanji === 0) return false;
  return (day?.answers ?? 0) >= targets.answers && (day?.learned ?? 0) >= targets.newKanji;
}

export function todayTargets(progress: Progress, now: number): TodayTargets {
  const { targets } = progress;
  const today = progress.daily[dayKey(now)];
  const anySet = targets.answers > 0 || targets.newKanji > 0;
  return {
    answers: status(targets.answers, today?.answers ?? 0),
    newKanji: status(targets.newKanji, today?.learned ?? 0),
    anySet,
    met: anySet && meetsTargets(targets, today),
  };
}

/**
 * Consecutive days the targets were met, ending today, or yesterday while
 * today's targets are still to do. Judged by today's targets, since past
 * targets aren't kept.
 */
export function targetStreak(progress: Progress, now: number): number {
  const met = (t: number) => meetsTargets(progress.targets, progress.daily[dayKey(t)]);
  const cursor = new Date(now);
  if (!met(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (met(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
