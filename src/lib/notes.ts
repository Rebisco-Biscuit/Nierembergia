// Personal notes per kanji: a mnemonic (memory story) and free-form notes,
// e.g. how to tell it apart from a look-alike. Persistence: library-store.ts.

export const NOTES_VERSION = 1;
export const MAX_NOTE_LENGTH = 2000;

export type NoteField = "mnemonic" | "note";

export interface KanjiNote {
  mnemonic: string;
  note: string;
  updatedAt: number;
}

export interface Notes {
  version: typeof NOTES_VERSION;
  kanji: Record<string, KanjiNote>;
}

export const emptyNotes = (): Notes => ({ version: NOTES_VERSION, kanji: {} });

/** Sets one field. A kanji whose fields are both blank is removed. */
export function setNote(notes: Notes, kanji: string, field: NoteField, text: string, now: number): Notes {
  const prev = notes.kanji[kanji] ?? { mnemonic: "", note: "", updatedAt: 0 };
  const value = text.slice(0, MAX_NOTE_LENGTH);
  if (prev[field] === value) return notes;
  const next = { ...prev, [field]: value, updatedAt: now };
  const kanjiNotes = { ...notes.kanji };
  if (!next.mnemonic.trim() && !next.note.trim()) delete kanjiNotes[kanji];
  else kanjiNotes[kanji] = next;
  return { ...notes, kanji: kanjiNotes };
}

/** Kanji with notes, most recently edited first. */
export const notedKanji = (notes: Notes): string[] =>
  Object.entries(notes.kanji)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .map(([k]) => k);

/** Reads stored notes defensively; malformed entries are dropped. */
export function parseNotes(raw: string | null): Notes {
  if (!raw) return emptyNotes();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyNotes();
  }
  if (typeof data !== "object" || data === null) return emptyNotes();
  const obj = data as Record<string, unknown>;
  if (obj.version !== NOTES_VERSION || typeof obj.kanji !== "object" || obj.kanji === null) return emptyNotes();

  const kanji: Record<string, KanjiNote> = {};
  for (const [char, value] of Object.entries(obj.kanji)) {
    const n = value as Record<string, unknown> | null;
    if (!n || typeof n.mnemonic !== "string" || typeof n.note !== "string") continue;
    if (!n.mnemonic.trim() && !n.note.trim()) continue;
    kanji[char] = {
      mnemonic: n.mnemonic.slice(0, MAX_NOTE_LENGTH),
      note: n.note.slice(0, MAX_NOTE_LENGTH),
      updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : 0,
    };
  }
  return { version: NOTES_VERSION, kanji };
}
