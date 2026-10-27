// Spaced-repetition scheduling: a simplified SM-2 (the algorithm behind
// SuperMemo and Anki). Each review's grade sets when the kanji is next due.

export type Grade = "forgot" | "hard" | "good" | "easy";
export const GRADES: Grade[] = ["forgot", "hard", "good", "easy"];

export interface SrsState {
  /** Days until the next review, after the latest one. 0 means "again soon". */
  interval: number;
  /** How fast intervals grow; starts at 2.5, never below 1.3. */
  ease: number;
  /** When the kanji is next due (ms timestamp). */
  due: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** A forgotten kanji comes back after this long, within the same day. */
const RELEARN_DELAY = 10 * 60 * 1000;
export const START_EASE = 2.5;
const MIN_EASE = 1.3;

const round = (n: number) => Math.round(n * 100) / 100;

/** The schedule after grading a review at `now`. `prev` is undefined for a first review. */
export function schedule(prev: SrsState | undefined, grade: Grade, now: number): SrsState {
  const ease = prev?.ease ?? START_EASE;

  if (grade === "forgot") {
    return { interval: 0, ease: prev ? Math.max(MIN_EASE, round(ease - 0.2)) : ease, due: now + RELEARN_DELAY };
  }

  let interval: number;
  let nextEase = ease;
  if (!prev || prev.interval === 0) {
    // New or just relearned.
    interval = grade === "easy" ? 4 : 1;
    if (grade === "easy") nextEase = round(ease + 0.15);
    if (grade === "hard") nextEase = Math.max(MIN_EASE, round(ease - 0.15));
  } else if (grade === "hard") {
    interval = Math.max(prev.interval + 1, Math.round(prev.interval * 1.2));
    nextEase = Math.max(MIN_EASE, round(ease - 0.15));
  } else if (grade === "good") {
    interval = Math.max(prev.interval + 1, Math.round(prev.interval * ease));
  } else {
    interval = Math.max(prev.interval + 2, Math.round(prev.interval * ease * 1.3));
    nextEase = round(ease + 0.15);
  }
  return { interval, ease: nextEase, due: now + interval * DAY };
}

export const isDue = (state: SrsState | undefined, now: number) => state !== undefined && state.due <= now;

/** "now", "in 10 min", "tomorrow", "in 3 days", "in 2 months". */
export function dueLabel(due: number, now: number): string {
  const ms = due - now;
  if (ms <= 0) return "now";
  if (ms < 60 * 60 * 1000) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
  if (ms < DAY) return "later today";
  const days = Math.round(ms / DAY);
  if (days === 1) return "tomorrow";
  if (days < 45) return `in ${days} days`;
  return `in ${Math.round(days / 30)} months`;
}
