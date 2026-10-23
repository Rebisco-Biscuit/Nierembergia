// Study progress: per-kanji answer history and a log of finished sessions.
// Pure functions; persistence lives in library-store.ts.

export const PROGRESS_VERSION = 1;
/** Correct answers in a row that count a kanji as mastered. */
export const MASTERED_STREAK = 3;
const MAX_SESSIONS = 200;

export interface KanjiStats {
  seen: number;
  correct: number;
  /** Correct answers in a row, ending with the latest one (0 if the latest was wrong). */
  streak: number;
  lastSeen: number;
}

export type StudyMode = "flashcards" | "quiz";

export interface SessionRecord {
  at: number;
  mode: StudyMode;
  total: number;
  correct: number;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  kanji: Record<string, KanjiStats>;
  /** Finished sessions, oldest first. */
  sessions: SessionRecord[];
}

export const emptyProgress = (): Progress => ({ version: PROGRESS_VERSION, kanji: {}, sessions: [] });

export function recordAnswer(progress: Progress, kanji: string, correct: boolean, now: number): Progress {
  const prev = progress.kanji[kanji] ?? { seen: 0, correct: 0, streak: 0, lastSeen: 0 };
  return {
    ...progress,
    kanji: {
      ...progress.kanji,
      [kanji]: {
        seen: prev.seen + 1,
        correct: prev.correct + (correct ? 1 : 0),
        streak: correct ? prev.streak + 1 : 0,
        lastSeen: now,
      },
    },
  };
}

export function recordSession(progress: Progress, session: SessionRecord): Progress {
  return { ...progress, sessions: [...progress.sessions, session].slice(-MAX_SESSIONS) };
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
    sessions: progress.sessions.length,
  };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

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
      if (!s || !isCount(s.seen) || !isCount(s.correct) || !isCount(s.streak) || typeof s.lastSeen !== "number") continue;
      if (s.correct > s.seen || s.streak > s.correct) continue;
      kanji[char] = { seen: s.seen, correct: s.correct, streak: s.streak, lastSeen: s.lastSeen };
    }
  }

  const sessions: SessionRecord[] = [];
  for (const value of Array.isArray(obj.sessions) ? obj.sessions : []) {
    const s = value as Record<string, unknown> | null;
    if (!s || typeof s.at !== "number" || (s.mode !== "flashcards" && s.mode !== "quiz")) continue;
    if (!isCount(s.total) || !isCount(s.correct) || s.correct > s.total) continue;
    sessions.push({ at: s.at, mode: s.mode, total: s.total, correct: s.correct });
  }

  return { version: PROGRESS_VERSION, kanji, sessions: sessions.slice(-MAX_SESSIONS) };
}
