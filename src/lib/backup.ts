// Export and import of everything saved in the browser: library, study
// progress, and notes, as one JSON file.

import { parseLibrary, type Library } from "./library";
import { parseNotes, type Notes } from "./notes";
import { parseProgress, type Progress, type SessionRecord } from "./progress";

export const BACKUP_APP = "nierembergia";
export const BACKUP_FORMAT = 1;

export interface UserData {
  library: Library;
  progress: Progress;
  notes: Notes;
}

export interface Backup extends UserData {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
}

export function createBackup(data: UserData, now: number): Backup {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date(now).toISOString(), ...data };
}

/** e.g. "nierembergia-backup-2026-10-29.json" (local date). */
export function backupFilename(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `nierembergia-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export type ParsedBackup = { ok: true; data: UserData; exportedAt: string | null } | { ok: false; error: string };

/**
 * Reads a backup file. Each part goes through the same defensive parser the
 * app uses for its own storage, so malformed entries are dropped, not trusted.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "This file isn't a Nierembergia backup." };
  const obj = raw as Record<string, unknown>;
  if (obj.app !== BACKUP_APP) return { ok: false, error: "This file isn't a Nierembergia backup." };
  if (obj.format !== BACKUP_FORMAT) {
    return { ok: false, error: "This backup was made by a different version of Nierembergia and can't be read." };
  }
  const part = (value: unknown) => (value === undefined ? null : JSON.stringify(value));
  return {
    ok: true,
    data: {
      library: parseLibrary(part(obj.library)),
      progress: parseProgress(part(obj.progress)),
      notes: parseNotes(part(obj.notes)),
    },
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : null,
  };
}

export interface DataCounts {
  bookmarks: number;
  collections: number;
  studied: number;
  sessions: number;
  notes: number;
}

export const countData = (d: UserData): DataCounts => ({
  bookmarks: d.library.bookmarks.length,
  collections: d.library.collections.length,
  studied: Object.keys(d.progress.kanji).length,
  sessions: d.progress.sessions.length,
  notes: Object.keys(d.notes.kanji).length,
});

/**
 * Combines imported data with what's already saved, losing nothing:
 * bookmarks and collection kanji are unioned (collections match by id),
 * each kanji keeps whichever study record has seen it more (then the more
 * recent), sessions are deduplicated, and the more recently edited note wins.
 */
export function mergeData(current: UserData, incoming: UserData): UserData {
  const bookmarks = [...new Set([...current.library.bookmarks, ...incoming.library.bookmarks])];

  const collections = current.library.collections.map((c) => {
    const other = incoming.library.collections.find((o) => o.id === c.id);
    return other ? { ...c, kanji: [...new Set([...c.kanji, ...other.kanji])] } : c;
  });
  for (const c of incoming.library.collections) {
    if (!collections.some((x) => x.id === c.id)) collections.push(c);
  }

  const kanji = { ...current.progress.kanji };
  for (const [char, s] of Object.entries(incoming.progress.kanji)) {
    const mine = kanji[char];
    if (!mine || s.seen > mine.seen || (s.seen === mine.seen && s.lastSeen > mine.lastSeen)) kanji[char] = s;
  }
  const sessionKey = (s: SessionRecord) => `${s.at}:${s.mode}:${s.total}:${s.correct}`;
  const seen = new Set(current.progress.sessions.map(sessionKey));
  const sessions = [...current.progress.sessions, ...incoming.progress.sessions.filter((s) => !seen.has(sessionKey(s)))]
    .sort((a, b) => a.at - b.at)
    .slice(-200);

  const notes = { ...current.notes.kanji };
  for (const [char, n] of Object.entries(incoming.notes.kanji)) {
    if (!notes[char] || n.updatedAt > notes[char].updatedAt) notes[char] = n;
  }

  return {
    library: { ...current.library, bookmarks, collections },
    progress: { ...current.progress, kanji, sessions },
    notes: { ...current.notes, kanji: notes },
  };
}
