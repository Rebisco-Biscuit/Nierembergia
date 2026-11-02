// Numbers for the progress dashboard, derived from saved study progress.
// Pure functions; the page renders them in the browser.

import { accuracyOf, dayKey, isMastered, type DayActivity, type Progress, type Tally } from "./progress";
import type { JlptLevel } from "./types";

/** The slice of each kanji the dashboard needs. */
export interface DashboardKanji {
  character: string;
  meaning: string;
  jlpt: JlptLevel | null;
  readings: string[];
  /** Top-level components, for weak-component stats. */
  parts: string[];
}

export interface DayPoint extends DayActivity {
  day: string;
}

/**
 * Activity for each of the last `days` days, oldest first, ending today.
 * Days from before daily tracking existed fall back to their sessions' totals.
 */
export function activityByDay(progress: Progress, days: number, now: number): DayPoint[] {
  const fromSessions = new Map<string, DayActivity>();
  for (const s of progress.sessions) {
    const key = dayKey(s.at);
    const d = fromSessions.get(key) ?? { answers: 0, correct: 0, learned: 0, ms: 0 };
    fromSessions.set(key, {
      ...d,
      answers: d.answers + s.total,
      correct: d.correct + s.correct,
      ms: d.ms + (s.ms ?? 0),
    });
  }
  const out: DayPoint[] = [];
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const day = dayKey(cursor.getTime());
    const activity = progress.daily[day] ?? fromSessions.get(day) ?? { answers: 0, correct: 0, learned: 0, ms: 0 };
    out.push({ day, ...activity });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Time spent in finished sessions, all time. */
export const totalStudyTime = (progress: Progress) => Object.values(progress.daily).reduce((sum, d) => sum + d.ms, 0);

/** "1 h 5 min", "12 min", "under a minute". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return ms > 0 ? "under a minute" : "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export interface LevelProgress {
  level: JlptLevel;
  total: number;
  studied: number;
  mastered: number;
}

export function jlptBreakdown(progress: Progress, kanji: DashboardKanji[]): LevelProgress[] {
  return ([5, 4, 3, 2, 1] as JlptLevel[]).map((level) => {
    const inLevel = kanji.filter((k) => k.jlpt === level);
    const stats = inLevel.map((k) => progress.kanji[k.character]).filter((s) => s !== undefined);
    return { level, total: inLevel.length, studied: stats.length, mastered: stats.filter(isMastered).length };
  });
}

export interface HardKanji {
  character: string;
  seen: number;
  accuracy: number;
}

/** Kanji answered at least `minSeen` times, lowest accuracy first; perfect ones are left out. */
export function hardestKanji(progress: Progress, limit: number, minSeen = 2): HardKanji[] {
  return Object.entries(progress.kanji)
    .filter(([, s]) => s.seen >= minSeen && s.correct < s.seen)
    .map(([character, s]) => ({ character, seen: s.seen, accuracy: accuracyOf(s) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen || a.character.localeCompare(b.character))
    .slice(0, limit);
}

/** Quiz accuracy by question kind, across all kanji. */
export function accuracyByKind(progress: Progress): Record<string, Tally> {
  const out: Record<string, Tally> = {};
  for (const s of Object.values(progress.kanji)) {
    for (const [kind, t] of Object.entries(s.byKind ?? {})) {
      const sum = out[kind] ?? { seen: 0, correct: 0 };
      out[kind] = { seen: sum.seen + t.seen, correct: sum.correct + t.correct };
    }
  }
  return out;
}

/** Kanji whose reading questions are missed more often than not. */
export function weakReadings(progress: Progress, limit: number): HardKanji[] {
  return Object.entries(progress.kanji)
    .flatMap(([character, s]) => {
      const t = s.byKind?.reading;
      return t && t.correct * 2 < t.seen ? [{ character, seen: t.seen, accuracy: t.correct / t.seen }] : [];
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen)
    .slice(0, limit);
}

export interface WeakComponent extends Tally {
  component: string;
  /** Studied kanji containing it, weakest first. */
  kanji: string[];
  accuracy: number;
}

const MIN_KANJI_PER_COMPONENT = 2;
const MIN_ANSWERS_PER_COMPONENT = 4;
const WEAK_COMPONENT_ACCURACY = 0.75;

/**
 * Components whose kanji you get wrong most: answers pooled over every
 * studied kanji built from the component. Needs a few kanji and answers to
 * count, so one bad kanji doesn't condemn its parts.
 */
export function weakComponents(progress: Progress, kanji: DashboardKanji[], limit: number): WeakComponent[] {
  const byComponent = new Map<string, { seen: number; correct: number; kanji: string[] }>();
  for (const k of kanji) {
    const s = progress.kanji[k.character];
    if (!s) continue;
    for (const part of new Set(k.parts)) {
      const sum = byComponent.get(part) ?? { seen: 0, correct: 0, kanji: [] };
      byComponent.set(part, {
        seen: sum.seen + s.seen,
        correct: sum.correct + s.correct,
        kanji: [...sum.kanji, k.character],
      });
    }
  }
  const accuracy = (c: string) => accuracyOf(progress.kanji[c]);
  return [...byComponent.entries()]
    .filter(([, t]) => t.kanji.length >= MIN_KANJI_PER_COMPONENT && t.seen >= MIN_ANSWERS_PER_COMPONENT)
    .map(([component, t]) => ({
      component,
      seen: t.seen,
      correct: t.correct,
      accuracy: t.correct / t.seen,
      kanji: [...t.kanji].sort((a, b) => accuracy(a) - accuracy(b)),
    }))
    .filter((c) => c.accuracy < WEAK_COMPONENT_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen)
    .slice(0, limit);
}
