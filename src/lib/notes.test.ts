import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH, emptyNotes, notedKanji, parseNotes, setNote } from "./notes";

describe("setNote", () => {
  it("sets a mnemonic and a note independently", () => {
    let n = setNote(emptyNotes(), "休", "mnemonic", "A person resting against a tree", 1);
    n = setNote(n, "休", "note", "Not 体 (body)", 2);
    expect(n.kanji["休"]).toEqual({ mnemonic: "A person resting against a tree", note: "Not 体 (body)", updatedAt: 2 });
  });

  it("removes the kanji when both fields are cleared", () => {
    let n = setNote(emptyNotes(), "休", "note", "x", 1);
    n = setNote(n, "休", "note", "   ", 2);
    expect(n.kanji).toEqual({});
  });

  it("returns the same object when nothing changes", () => {
    const n = setNote(emptyNotes(), "休", "note", "x", 1);
    expect(setNote(n, "休", "note", "x", 5)).toBe(n);
  });

  it("caps the length", () => {
    const n = setNote(emptyNotes(), "休", "note", "あ".repeat(MAX_NOTE_LENGTH + 50), 1);
    expect(n.kanji["休"].note).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("does not mutate the previous state", () => {
    const before = emptyNotes();
    setNote(before, "休", "note", "x", 1);
    expect(before.kanji).toEqual({});
  });
});

describe("notedKanji", () => {
  it("lists kanji with notes, most recently edited first", () => {
    let n = setNote(emptyNotes(), "水", "note", "a", 1);
    n = setNote(n, "火", "note", "b", 3);
    n = setNote(n, "木", "mnemonic", "c", 2);
    expect(notedKanji(n)).toEqual(["火", "木", "水"]);
  });
});

describe("parseNotes", () => {
  it("round-trips saved notes", () => {
    const n = setNote(emptyNotes(), "休", "mnemonic", "rest", 7);
    expect(parseNotes(JSON.stringify(n))).toEqual(n);
  });

  it("starts fresh on missing, corrupt, or unknown-version data", () => {
    expect(parseNotes(null)).toEqual(emptyNotes());
    expect(parseNotes("{oops")).toEqual(emptyNotes());
    expect(parseNotes(JSON.stringify({ version: 9, kanji: {} }))).toEqual(emptyNotes());
  });

  it("drops malformed or blank entries", () => {
    const parsed = parseNotes(
      JSON.stringify({
        version: 1,
        kanji: {
          水: { mnemonic: "water", note: "", updatedAt: 1 },
          火: { mnemonic: 3, note: "" },
          木: { mnemonic: " ", note: "" },
          金: { mnemonic: "", note: "gold" },
        },
      }),
    );
    expect(Object.keys(parsed.kanji).sort()).toEqual(["水", "金"]);
    expect(parsed.kanji["金"].updatedAt).toBe(0);
  });
});
