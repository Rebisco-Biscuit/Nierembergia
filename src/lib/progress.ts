// Study progress: per-kanji answer history and a log of finished sessions.
// Pure functions; persistence lives in library-store.ts.

import { isDue, schedule, type Grade, type SrsState } from "./srs";

export const PROGRESS_VERSION = 1;
/** Correct answers in a row that count a kanji as mastered. */
export const MASTERED_STREAK = 3;
const MAX_SESSIONS = 200;
/** Days of activity kept for charts (a little over a year). */
const MAX_DAYS = 400;
/** A session's time counts at most this much, in case the tab was left open. */
export const MAX_SESSION_MS = 60 * 60 * 1000;

export interface Tally {
  seen: number;
  correct: number;
}

export interface KanjiStats {
  seen: number;
  correct: number;
  /** Correct answers in a row, ending with the latest one (0 if the latest was wrong). */
  streak: number;
  lastSeen: number;
  /** Spaced-repetition schedule; absent for progress saved before scheduling existed. */
  srs?: SrsState;
  /** Answers by quiz question kind (meaning, reading, missing…), for weak-area stats. */
  byKind?: Record<string, Tally>;
}

export type StudyMode = "flashcards" | "quiz";

export interface SessionRecord {
  at: number;
  mode: StudyMode;
  total: number;
  correct: number;
  /** How long it took; absent for sessions saved before timing existed. */
  ms?: number;
}

/** Daily study targets; 0 turns a target off. */
export interface Targets {
  /** Flashcard or quiz answers per day. */
  answers: number;
  /** Kanji answered for the first time per day. */
  newKanji: number;
}

export const DEFAULT_TARGETS: Targets = { answers: 20, newKanji: 5 };
export const MAX_TARGET = 500;

/** A whole number from 0 to MAX_TARGET. */
export const clampTarget = (n: number) => (Number.isFinite(n) ? Math.min(MAX_TARGET, Math.max(0, Math.round(n))) : 0);

/** One calendar day of studying. */
export interface DayActivity {
  answers: number;
  correct: number;
  /** Kanji answered for the first time. */
  learned: number;
  /** Time spent in finished sessions. */
  ms: number;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  kanji: Record<string, KanjiStats>;
  /** Finished sessions, oldest first. */
  sessions: SessionRecord[];
  /** Activity by local day ("2026-11-02"), for charts and daily targets. */
  daily: Record<string, DayActivity>;
  /** Kanji pages visited, with the first visit's time. */
  explored: Record<string, number>;
  targets: Targets;
}

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION,
  kanji: {},
  sessions: [],
  daily: {},
  explored: {},
  targets: { ...DEFAULT_TARGETS },
});

const emptyDay = (): DayActivity => ({ answers: 0, correct: 0, learned: 0, ms: 0 });

/** Adds to one day's activity, dropping the oldest days past MAX_DAYS. */
function addToDay(daily: Record<string, DayActivity>, day: string, add: Partial<DayActivity>) {
  const prev = daily[day] ?? emptyDay();
  const next = {
    ...daily,
    [day]: {
      answers: prev.answers + (add.answers ?? 0),
      correct: prev.correct + (add.correct ?? 0),
      learned: prev.learned + (add.learned ?? 0),
      ms: prev.ms + (add.ms ?? 0),
    },
  };
  const days = Object.keys(next);
  if (days.length <= MAX_DAYS) return next;
  for (const old of days.sort().slice(0, days.length - MAX_DAYS)) delete next[old];
  return next;
}

/**
 * Records one answer. `grade` refines it for scheduling (hard and easy are
 * still correct); without one, a right answer counts as "good" and a wrong
 * one as "forgot".
 */
export function recordAnswer(
  progress: Progress,
  kanji: string,
  correct: boolean,
  now: number,
  grade: Grade = correct ? "good" : "forgot",
  /** The quiz question kind, if the answer came from a quiz. */
  kind?: string,
): Progress {
  const prev: KanjiStats = progress.kanji[kanji] ?? { seen: 0, correct: 0, streak: 0, lastSeen: 0 };
  const stats: KanjiStats = {
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    streak: correct ? prev.streak + 1 : 0,
    lastSeen: now,
    srs: schedule(prev.srs, grade, now),
  };
  if (prev.byKind || kind) {
    const tally = (kind && prev.byKind?.[kind]) || { seen: 0, correct: 0 };
    stats.byKind = kind
      ? { ...prev.byKind, [kind]: { seen: tally.seen + 1, correct: tally.correct + (correct ? 1 : 0) } }
      : prev.byKind;
  }
  return {
    ...progress,
    kanji: { ...progress.kanji, [kanji]: stats },
    daily: addToDay(progress.daily, dayKey(now), {
      answers: 1,
      correct: correct ? 1 : 0,
      learned: prev.seen === 0 ? 1 : 0,
    }),
  };
}

export function recordSession(progress: Progress, session: SessionRecord): Progress {
  const ms = session.ms === undefined ? undefined : Math.min(Math.max(0, Math.round(session.ms)), MAX_SESSION_MS);
  return {
    ...progress,
    sessions: [...progress.sessions, { ...session, ...(ms !== undefined && { ms }) }].slice(-MAX_SESSIONS),
    daily: ms ? addToDay(progress.daily, dayKey(session.at), { ms }) : progress.daily,
  };
}

/** Notes a visit to a kanji's page; only the first visit is kept. */
export function recordVisit(progress: Progress, kanji: string, now: number): Progress {
  if (progress.explored[kanji] !== undefined) return progress;
  return { ...progress, explored: { ...progress.explored, [kanji]: now } };
}

export const accuracyOf = (s: KanjiStats) => (s.seen ? s.correct / s.seen : 0);
export const isMastered = (s: KanjiStats) => s.streak >= MASTERED_STREAK;
/** Missed the last time it came up. */
export const isWeak = (s: KanjiStats) => s.seen > 0 && s.streak === 0;

/** A local calendar day, e.g. "2026-10-23". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Consecutive days with a finished session, ending today, or yesterday if
 * nothing has been studied yet today (the streak is still alive).
 */
export function dayStreak(sessions: SessionRecord[], now: number): number {
  const days = new Set(sessions.map((s) => dayKey(s.at)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface ProgressSummary {
  studied: number;
  answers: number;
  /** Share of all answers that were correct; null before any answers. */
  accuracy: number | null;
  mastered: number;
  dayStreak: number;
  /** Missed last time: lowest accuracy first, then most recently seen. */
  weak: string[];
  /** Due for review now, most overdue first. */
  due: string[];
  /** When the next not-yet-due review comes up, or null if none is scheduled. */
  nextDue: number | null;
  sessions: number;
}

export function summarize(progress: Progress, now: number): ProgressSummary {
  const entries = Object.entries(progress.kanji);
  const answers = entries.reduce((n, [, s]) => n + s.seen, 0);
  const correct = entries.reduce((n, [, s]) => n + s.correct, 0);
  return {
    studied: entries.length,
    answers,
    accuracy: answers ? correct / answers : null,
    mastered: entries.filter(([, s]) => isMastered(s)).length,
    dayStreak: dayStreak(progress.sessions, now),
    weak: entries
      .filter(([, s]) => isWeak(s))
      .sort(([, a], [, b]) => accuracyOf(a) - accuracyOf(b) || b.lastSeen - a.lastSeen)
      .map(([k]) => k),
    due: entries
      .filter(([, s]) => isDue(s.srs, now))
      .sort(([, a], [, b]) => a.srs!.due - b.srs!.due)
      .map(([k]) => k),
    nextDue: entries.reduce<number | null>((min, [, s]) => {
      if (!s.srs || s.srs.due <= now) return min;
      return min === null ? s.srs.due : Math.min(min, s.srs.due);
    }, null),
    sessions: progress.sessions.length,
  };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

function parseSrs(value: unknown): SrsState | null {
  if (typeof value !== "object" || value === null) return null;
  const { interval, ease, due } = value as Record<string, unknown>;
  if (!isCount(interval) || typeof ease !== "number" || ease < 1 || typeof due !== "number") return null;
  return { interval, ease, due };
}

/** Reads stored progress defensively; malformed entries are dropped. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (typeof data !== "object" || data === null) return emptyProgress();
  const obj = data as Record<string, unknown>;
  if (obj.version !== PROGRESS_VERSION) return emptyProgress();

  const kanji: Record<string, KanjiStats> = {};
  if (typeof obj.kanji === "object" && obj.kanji !== null) {
    for (const [char, value] of Object.entries(obj.kanji)) {
      const s = value as Record<string, unknown> | null;
      if (!s || !isCount(s.seen) || !isCount(s.correct) || !isCount(s.streak) || typeof s.lastSeen !== "number")
        continue;
      if (s.correct > s.seen || s.streak > s.correct) continue;
      kanji[char] = { seen: s.seen, correct: s.correct, streak: s.streak, lastSeen: s.lastSeen };
      const srs = parseSrs(s.srs);
      if (srs) kanji[char].srs = srs;
      const byKind = parseTallies(s.byKind);
      if (byKind) kanji[char].byKind = byKind;
    }
  }

  const sessions: SessionRecord[] = [];
  for (const value of Array.isArray(obj.sessions) ? obj.sessions : []) {
    const s = value as Record<string, unknown> | null;
    if (!s || typeof s.at !== "number" || (s.mode !== "flashcards" && s.mode !== "quiz")) continue;
    if (!isCount(s.total) || !isCount(s.correct) || s.correct > s.total) continue;
    sessions.push({ at: s.at, mode: s.mode, total: s.total, correct: s.correct, ...(isCount(s.ms) && { ms: s.ms }) });
  }

  const daily: Record<string, DayActivity> = {};
  for (const [day, value] of Object.entries(asRecord(obj.daily))) {
    const d = value as Record<string, unknown> | null;
    if (!/^\d{4}-\d\d-\d\d$/.test(day) || !d) continue;
    if (![d.answers, d.correct, d.learned, d.ms].every(isCount) || (d.correct as number) > (d.answers as number))
      continue;
    daily[day] = {
      answers: d.answers as number,
      correct: d.correct as number,
      learned: d.learned as number,
      ms: d.ms as number,
    };
  }

  const explored: Record<string, number> = {};
  for (const [char, at] of Object.entries(asRecord(obj.explored))) {
    if (typeof at === "number") explored[char] = at;
  }

  const t = asRecord(obj.targets);
  const targets: Targets = {
    answers: typeof t.answers === "number" ? clampTarget(t.answers) : DEFAULT_TARGETS.answers,
    newKanji: typeof t.newKanji === "number" ? clampTarget(t.newKanji) : DEFAULT_TARGETS.newKanji,
  };

  return { version: PROGRESS_VERSION, kanji, sessions: sessions.slice(-MAX_SESSIONS), daily, explored, targets };
}

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function parseTallies(value: unknown): Record<string, Tally> | null {
  const out: Record<string, Tally> = {};
  for (const [kind, v] of Object.entries(asRecord(value))) {
    const t = v as Record<string, unknown> | null;
    if (t && isCount(t.seen) && isCount(t.correct) && t.correct <= t.seen)
      out[kind] = { seen: t.seen, correct: t.correct };
  }
  return Object.keys(out).length ? out : null;
}
