import { describe, expect, it } from "vitest";
import {
  align,
  buildSentence,
  parseIndexLine,
  pickSentences,
  wordSegments,
  type ReadingLookup,
  type Sentence,
  type SentenceCandidate,
} from "./sentences";

describe("parseIndexLine", () => {
  it("reads headwords, readings, entry numbers, surface forms, and checked marks", () => {
    expect(parseIndexLine("彼(かれ)[01] は 会う[01]{会えない} と(#1008490)[04]~ 事(こと){こと}")).toEqual([
      { headword: "彼", reading: "かれ", good: false },
      { headword: "は", good: false },
      { headword: "会う", surface: "会えない", good: false },
      { headword: "と", seq: "1008490", good: true },
      { headword: "事", reading: "こと", surface: "こと", good: false },
    ]);
  });
});

describe("align", () => {
  it("matches kana to place furigana over each run of kanji", () => {
    expect(align("食べ物", "たべもの")).toEqual([["食", "た"], ["べ"], ["物", "もの"]]);
    expect(align("学校", "がっこう")).toEqual([["学校", "がっこう"]]);
    expect(align("お茶", "おちゃ")).toEqual([["お"], ["茶", "ちゃ"]]);
  });

  it("returns null when the reading doesn't fit", () => {
    expect(align("食べる", "のむ")).toBeNull();
  });
});

describe("wordSegments", () => {
  it("handles spelling variants and inflected forms", () => {
    expect(wordSegments("腹いっぱい", "腹一杯", "はらいっぱい")).toEqual([["腹", "はら"], ["いっぱい"]]);
    expect(wordSegments("食べました", "食べる", "たべる")).toEqual([["食", "た"], ["べました"]]);
    expect(wordSegments("会えない", "会う", "あう")).toEqual([["会", "あ"], ["えない"]]);
  });

  it("knows 来る's stem changes", () => {
    expect(wordSegments("来ない", "来る", "くる")).toEqual([["来", "こ"], ["ない"]]);
    expect(wordSegments("来た", "来る", "くる")).toEqual([["来", "き"], ["た"]]);
    // A bare stem isn't the whole word: 来さえすれば.
    expect(wordSegments("来", "来る", "くる")).toEqual([["来", "き"]]);
  });
});

const JMDICT: Record<string, string> = { 忙しい: "いそがしい", 会う: "あう", 家族: "かぞく", 食べる: "たべる" };
const lookup: ReadingLookup = (headword) => JMDICT[headword];

describe("buildSentence", () => {
  it("adds furigana and word-by-word romaji", () => {
    const s = buildSentence(1, "彼は忙しいですか。", "Is he busy?", parseIndexLine("彼(かれ)[01] は 忙しい ですか"), lookup)!;
    expect(s.ja).toEqual([["彼", "かれ"], ["は"], ["忙", "いそが"], ["しいですか。"]]);
    expect(s.romaji).toBe("Kare wa isogashii desuka.");
    expect(s.en).toBe("Is he busy?");
  });

  it("reads inflected words and keeps unindexed punctuation", () => {
    const s = buildSentence(2, "家族と、会えない。", "", parseIndexLine("家族 と 会う{会えない}"), lookup)!;
    expect(s.romaji).toBe("Kazoku to, aenai.");
  });

  it("skips sentences it can't read fully", () => {
    // 生活 has no reading in the line or the lookup.
    expect(buildSentence(3, "生活は忙しい。", "", parseIndexLine("生活 は 忙しい"), lookup)).toBeNull();
    // A kanji outside any indexed word.
    expect(buildSentence(4, "彼は忙しい人。", "", parseIndexLine("彼(かれ) は 忙しい"), lookup)).toBeNull();
    // Digits have no recorded reading.
    expect(buildSentence(5, "２０歳です。", "", parseIndexLine("二十歳(はたち){２０歳} です"), lookup)).toBeNull();
  });

  it("writes particles as they're said", () => {
    const s = buildSentence(7, "家族には会う。", "", parseIndexLine("家族 には 会う"), lookup)!;
    expect(s.romaji).toBe("Kazoku niwa au.");
  });

  it("skips crude sentences", () => {
    expect(buildSentence(6, "彼は忙しいですか。", "Is he fucking busy?", parseIndexLine("彼(かれ) は 忙しい ですか"), lookup)).toBeNull();
  });
});

describe("pickSentences", () => {
  const sentence = (id: number, text: string): Sentence => ({ id, ja: [[text]], romaji: "", en: "" });
  const candidate = (id: number, text: string, words: string[], good = false): SentenceCandidate => ({
    sentence: sentence(id, text),
    words,
    good,
  });
  // 水 and 火 are N5 (1); 滝 is hard (5).
  const difficulty = (ch: string) => ({ 水: 1, 火: 1, 滝: 5 })[ch as "水"] ?? 3;

  it("prefers easy kanji, checked examples, and different words", () => {
    const picked = pickSentences(
      "水",
      [
        candidate(1, "滝の水はとても冷たいです。", ["水"]),
        candidate(2, "水を飲みたいですね。", ["水"]),
        candidate(3, "水をください、お願い。", ["水"], true),
        candidate(4, "水道の水が出ませんよ。", ["水道"]),
      ],
      difficulty,
      2,
    );
    expect(picked.map((s) => s.id)).toEqual([3, 4]);
  });

  it("skips very short and very long sentences, and duplicates", () => {
    const picked = pickSentences(
      "水",
      [
        candidate(1, "水。", ["水"]),
        candidate(2, "水".repeat(30), ["水"]),
        candidate(3, "水を飲みます。", ["水"]),
        candidate(4, "水を飲みます。", ["水"]),
      ],
      difficulty,
      3,
    );
    expect(picked.map((s) => s.id)).toEqual([3]);
  });
});
