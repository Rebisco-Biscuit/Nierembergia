import { describe, expect, it } from "vitest";
import kanjiJson from "@/data/kanji.json";
import { addToCollection, createCollection, emptyLibrary, toggleBookmark } from "./library";
import { seededRandom, shuffle } from "./random";
import {
  OPTION_COUNT,
  QUESTION_KINDS,
  deckFromSource,
  displayReading,
  makeQuestion,
  makeQuiz,
  readingsOf,
  toStudyKanji,
  type StudyKanji,
} from "./study";
import type { Kanji } from "./types";

const all = (kanjiJson as Kanji[]).map((k) => toStudyKanji(k));
const byChar = new Map(all.map((k) => [k.character, k]));
const get = (c: string) => byChar.get(c)!;

describe("seededRandom and shuffle", () => {
  it("is deterministic for a seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("shuffles without losing or duplicating items", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(items, seededRandom(1));
    expect(out).not.toEqual(items);
    expect([...out].sort((x, y) => x - y)).toEqual(items);
  });
});

describe("deckFromSource", () => {
  let lib = toggleBookmark(toggleBookmark(emptyLibrary(), "水"), "火");
  lib = addToCollection(createCollection(lib, "Trees", "t", 0), "t", "林");

  it("uses bookmarks, newest first", () => {
    expect(deckFromSource({ kind: "bookmarks" }, lib, all).map((k) => k.character)).toEqual(["火", "水"]);
  });

  it("uses a collection", () => {
    expect(deckFromSource({ kind: "collection", id: "t" }, lib, all).map((k) => k.character)).toEqual(["林"]);
    expect(deckFromSource({ kind: "collection", id: "missing" }, lib, all)).toEqual([]);
  });

  it("uses a JLPT level", () => {
    const n5 = deckFromSource({ kind: "jlpt", level: 5 }, lib, all);
    expect(n5.length).toBeGreaterThan(50);
    expect(n5.every((k) => k.jlpt === 5)).toBe(true);
  });

  it("uses the weak list, in its order", () => {
    expect(deckFromSource({ kind: "weak" }, lib, all, { weak: ["木", "水"] }).map((k) => k.character)).toEqual(["木", "水"]);
    expect(deckFromSource({ kind: "weak" }, lib, all)).toEqual([]);
  });

  it("uses the due list", () => {
    expect(deckFromSource({ kind: "due" }, lib, all, { due: ["火"], weak: ["木"] }).map((k) => k.character)).toEqual(["火"]);
  });

  it("skips characters missing from the dataset", () => {
    const odd = toggleBookmark(emptyLibrary(), "☃");
    expect(deckFromSource({ kind: "bookmarks" }, odd, all)).toEqual([]);
  });
});

describe("displayReading", () => {
  it("drops okurigana and affix marks", () => {
    expect(displayReading("た.べる")).toBe("たべる");
    expect(displayReading("-び")).toBe("び");
  });
});

describe("readingsOf", () => {
  it("drops readings that only differ by okurigana marks", () => {
    const k: StudyKanji = { character: "成", meanings: [], onyomi: ["セイ"], kunyomi: ["な.す", "なす"], jlpt: null };
    expect(readingsOf(k)).toEqual(["セイ", "なす"]);
  });
});

describe("makeQuestion", () => {
  const n5 = all.filter((k) => k.jlpt === 5);

  it.each(QUESTION_KINDS)("builds a valid %s question", (kind) => {
    for (let seed = 0; seed < 30; seed++) {
      const target = n5[seed];
      const q = makeQuestion(kind, target, all, seededRandom(seed));
      if (!q) continue;
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(q.options[q.answer].kanji).toBe(target);
      expect(new Set(q.options.map((o) => o.label)).size).toBe(OPTION_COUNT);
      expect(new Set(q.options.map((o) => o.kanji!.character)).size).toBe(OPTION_COUNT);
    }
  });

  it("never offers a distractor that is also a correct answer", () => {
    for (let seed = 0; seed < 50; seed++) {
      const target = n5[seed % n5.length];
      const meaning = makeQuestion("meaning", target, all, seededRandom(seed))!;
      for (const [i, o] of meaning.options.entries()) {
        if (i === meaning.answer) continue;
        expect(target.meanings.map((m) => m.toLowerCase())).not.toContain(o.label.toLowerCase());
      }
      const reading = makeQuestion("reading", target, all, seededRandom(seed));
      for (const [i, o] of (reading?.options ?? []).entries()) {
        if (i === reading!.answer) continue;
        expect(readingsOf(target)).not.toContain(o.label);
      }
    }
  });

  it("never offers another kanji with the same meaning when asking for a kanji", () => {
    // 食 and 喰 both mean "eat"; 喰 must not appear as a wrong answer for 食.
    const pool = [get("食"), get("喰"), get("水"), get("火"), get("木"), get("金")];
    for (let seed = 0; seed < 20; seed++) {
      const q = makeQuestion("kanji", get("食"), pool, seededRandom(seed))!;
      expect(q.options.map((o) => o.label)).not.toContain("喰");
    }
  });

  it("prefers distractors from the same JLPT level", () => {
    const q = makeQuestion("meaning", get("水"), all, seededRandom(7))!;
    expect(q.options.every((o) => o.kanji!.jlpt === 5)).toBe(true);
  });

  it("returns null when the target has nothing to ask", () => {
    const blank: StudyKanji = { character: "〇", meanings: [], onyomi: [], kunyomi: [], jlpt: null };
    expect(makeQuestion("meaning", blank, all, seededRandom(1))).toBeNull();
    expect(makeQuestion("reading", blank, all, seededRandom(1))).toBeNull();
    expect(makeQuestion("kanji", blank, all, seededRandom(1))).toBeNull();
  });

  it("returns null when there are too few distractors", () => {
    expect(makeQuestion("meaning", get("水"), [get("水"), get("火")], seededRandom(1))).toBeNull();
  });
});

describe("makeQuiz", () => {
  const deck = ["水", "火", "木", "金", "土", "日", "月"].map(get);

  it("asks each kanji at most once, up to the count", () => {
    const quiz = makeQuiz(deck, all, 5, QUESTION_KINDS, seededRandom(3));
    expect(quiz).toHaveLength(5);
    expect(new Set(quiz.map((q) => q.target.character)).size).toBe(5);
  });

  it("mixes the requested kinds", () => {
    const quiz = makeQuiz(deck, all, 6, QUESTION_KINDS, seededRandom(3));
    expect(new Set(quiz.map((q) => q.kind))).toEqual(new Set(QUESTION_KINDS));
  });

  it("is reproducible for a seed", () => {
    const a = makeQuiz(deck, all, 5, QUESTION_KINDS, seededRandom(9));
    const b = makeQuiz(deck, all, 5, QUESTION_KINDS, seededRandom(9));
    expect(a.map((q) => [q.kind, q.target.character, q.answer])).toEqual(
      b.map((q) => [q.kind, q.target.character, q.answer]),
    );
  });
});
