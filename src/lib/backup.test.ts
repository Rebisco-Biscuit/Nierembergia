import { describe, expect, it } from "vitest";
import { backupFilename, countData, createBackup, mergeData, parseBackup, type UserData } from "./backup";
import { addToCollection, createCollection, emptyLibrary, toggleBookmark } from "./library";
import { emptyNotes, setNote } from "./notes";
import { emptyProgress, recordAnswer, recordSession } from "./progress";

const T = new Date(2026, 9, 29, 9).getTime();

function sample(): UserData {
  let library = toggleBookmark(emptyLibrary(), "水");
  library = addToCollection(createCollection(library, "Trees", "c1", T), "c1", "木");
  let progress = recordAnswer(emptyProgress(), "水", true, T);
  progress = recordSession(progress, { at: T, mode: "quiz", total: 1, correct: 1 });
  const notes = setNote(emptyNotes(), "水", "mnemonic", "three drops", T);
  return { library, progress, notes };
}

describe("createBackup and parseBackup", () => {
  it("round-trips all data", () => {
    const data = sample();
    const parsed = parseBackup(JSON.stringify(createBackup(data, T)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual(data);
      expect(parsed.exportedAt).toBe(new Date(T).toISOString());
    }
  });

  it("rejects non-JSON, other files, and other formats with a reason", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, error: "This file isn't valid JSON." });
    expect(parseBackup(JSON.stringify({ hello: 1 }))).toMatchObject({ ok: false });
    const future = { ...createBackup(sample(), T), format: 2 };
    expect(parseBackup(JSON.stringify(future))).toMatchObject({ ok: false, error: expect.stringContaining("different version") });
  });

  it("drops malformed parts instead of trusting them", () => {
    const tampered = { ...createBackup(sample(), T), library: { version: 1, bookmarks: ["水", 42], collections: "x" }, notes: "junk" };
    const parsed = parseBackup(JSON.stringify(tampered));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.library.bookmarks).toEqual(["水"]);
      expect(parsed.data.library.collections).toEqual([]);
      expect(parsed.data.notes.kanji).toEqual({});
      expect(Object.keys(parsed.data.progress.kanji)).toEqual(["水"]);
    }
  });

  it("treats missing parts as empty", () => {
    const parsed = parseBackup(JSON.stringify({ app: "nierembergia", format: 1 }));
    expect(parsed.ok && countData(parsed.data)).toEqual({ bookmarks: 0, collections: 0, studied: 0, sessions: 0, notes: 0 });
  });
});

describe("backupFilename", () => {
  it("uses the local date", () => {
    expect(backupFilename(T)).toBe("nierembergia-backup-2026-10-29.json");
  });
});

describe("countData", () => {
  it("summarises what a backup holds", () => {
    expect(countData(sample())).toEqual({ bookmarks: 1, collections: 1, studied: 1, sessions: 1, notes: 1 });
  });
});

describe("mergeData", () => {
  const mine = sample();
  let theirs: UserData = sample();
  theirs = {
    library: addToCollection(createCollection(toggleBookmark(theirs.library, "火"), "Fire", "c2", T), "c1", "林"),
    progress: recordSession(recordAnswer(recordAnswer(theirs.progress, "水", false, T + 5), "火", true, T + 5), {
      at: T + 5,
      mode: "flashcards",
      total: 2,
      correct: 1,
    }),
    notes: setNote(setNote(theirs.notes, "水", "mnemonic", "newer story", T + 9), "火", "note", "fire!", T + 9),
  };
  const merged = mergeData(mine, theirs);

  it("unions bookmarks and collection kanji, adding new collections", () => {
    expect(merged.library.bookmarks).toEqual(["水", "火"]);
    expect(merged.library.collections.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(merged.library.collections[0].kanji).toEqual(["木", "林"]);
  });

  it("keeps the study record that has seen each kanji more", () => {
    expect(merged.progress.kanji["水"].seen).toBe(2);
    expect(merged.progress.kanji["火"].seen).toBe(1);
  });

  it("deduplicates sessions and keeps them in order", () => {
    expect(merged.progress.sessions.map((s) => s.at)).toEqual([T, T + 5]);
  });

  it("keeps the more recently edited note", () => {
    expect(merged.notes.kanji["水"].mnemonic).toBe("newer story");
    expect(merged.notes.kanji["火"].note).toBe("fire!");
  });

  it("changes nothing when merging data with itself", () => {
    expect(mergeData(mine, mine)).toEqual(mine);
  });
});
