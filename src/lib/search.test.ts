import { describe, expect, it } from "vitest";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import { normalizeReading, search } from "./search";
import type { Dataset, Kanji, Radical } from "./types";

const real: Dataset = {
  kanji: kanjiJson as Kanji[],
  radicals: radicalsJson as Radical[],
};

const chars = (list: Kanji[]) => list.map((k) => k.character);

describe("normalizeReading", () => {
  it("converts katakana and strips okurigana/affix marks", () => {
    expect(normalizeReading("スイ")).toBe("すい");
    expect(normalizeReading("た.べる")).toBe("たべる");
    expect(normalizeReading("-び")).toBe("び");
  });
});

describe("search", () => {
  it("returns every kanji when the query is empty", () => {
    const result = search("", {}, real);
    expect(result.kind).toBe("browse");
    expect(result.kanji).toHaveLength(real.kanji.length);
  });

  it("finds a kanji by its character", () => {
    const result = search("水", {}, real);
    expect(result.kind).toBe("character");
    expect(result.kanji[0].character).toBe("水");
  });

  it("returns each kanji in a multi-character query, in order", () => {
    expect(chars(search("日本", {}, real).kanji).slice(0, 2)).toEqual(["日", "本"]);
  });

  it("treats a radical character or variant as a radical lookup", () => {
    const result = search("氵", {}, real);
    expect(result.radicals.map((r) => r.number)).toEqual([85]);
    expect(chars(result.kanji)).toEqual(expect.arrayContaining(["海", "池", "泳"]));
    expect(result.kanji.every((k) => k.radical === 85)).toBe(true);
  });

  it("lists the kanji itself before others sharing its radical", () => {
    const result = search("木", {}, real);
    expect(result.kanji[0].character).toBe("木");
    expect(chars(result.kanji)).toContain("林");
  });

  it("supports radical-number queries", () => {
    for (const q of ["r:85", "radical 85", "R85"]) {
      const result = search(q, {}, real);
      expect(result.kind).toBe("radical");
      expect(result.radicals[0].character).toBe("水");
      expect(result.kanji.every((k) => k.radical === 85)).toBe(true);
    }
    expect(search("r:999", {}, real).kanji).toEqual([]);
  });

  it("finds kanji by kun'yomi including okurigana", () => {
    expect(chars(search("たべる", {}, real).kanji)[0]).toBe("食");
  });

  it("matches on'yomi given in hiragana or katakana", () => {
    const hira = chars(search("すい", {}, real).kanji);
    const kata = chars(search("スイ", {}, real).kanji);
    expect(hira).toContain("水");
    expect(kata).toEqual(hira);
  });

  it("finds kanji by English meaning, exact matches first", () => {
    const result = search("water", {}, real);
    expect(result.kind).toBe("meaning");
    expect(result.kanji[0].character).toBe("水");
  });

  it("prefers a kanji whose primary meaning matches", () => {
    // 放 also lists "fire" (as in to fire a gun), but 火 means fire first.
    expect(search("fire", {}, real).kanji[0].character).toBe("火");
  });

  it("does not match meanings mid-word", () => {
    // "ear" must not hit "year" or "early".
    const result = search("ear", {}, real);
    expect(result.kanji[0].character).toBe("耳");
    expect(chars(result.kanji)).not.toContain("年");
  });

  it("matches romaji readings", () => {
    expect(chars(search("mizu", {}, real).kanji)).toContain("水");
  });

  it("ranks meaning matches above romaji reading matches", () => {
    const result = chars(search("man", {}, real).kanji);
    expect(result.indexOf("万")).toBeGreaterThan(0);
  });

  it("surfaces radicals named by an English query", () => {
    expect(search("water", {}, real).radicals.map((r) => r.number)).toEqual([85]);
  });

  it("returns nothing for gibberish", () => {
    expect(search("zzqx", {}, real).kanji).toEqual([]);
  });

  it("is case and whitespace insensitive", () => {
    expect(chars(search("  WATER ", {}, real).kanji)).toEqual(
      chars(search("water", {}, real).kanji),
    );
  });
});

describe("search filters", () => {
  it("filters by JLPT level", () => {
    const result = search("", { jlpt: [5] }, real);
    expect(result.kanji.length).toBeGreaterThan(50);
    expect(result.kanji.every((k) => k.jlpt === 5)).toBe(true);
  });

  it("filters by school grade", () => {
    const result = search("", { grades: [1] }, real);
    expect(result.kanji).toHaveLength(80);
  });

  it("filters by stroke range", () => {
    const result = search("", { minStrokes: 3, maxStrokes: 4 }, real);
    expect(result.kanji.every((k) => k.strokes >= 3 && k.strokes <= 4)).toBe(true);
  });

  it("combines filters with a query", () => {
    const result = search("氵", { jlpt: [5] }, real);
    expect(result.kanji.length).toBeGreaterThan(0);
    expect(result.kanji.every((k) => k.jlpt === 5 && k.radical === 85)).toBe(true);
  });
});

describe("dataset integrity", () => {
  it("has the 214 Kangxi radicals, numbered in order", () => {
    expect(real.radicals.map((r) => r.number)).toEqual(
      Array.from({ length: 214 }, (_, i) => i + 1),
    );
  });

  it("gives every kanji a valid radical and stroke count", () => {
    for (const k of real.kanji) {
      expect(k.radical, k.character).toBeGreaterThanOrEqual(1);
      expect(k.radical, k.character).toBeLessThanOrEqual(214);
      expect(k.strokes, k.character).toBeGreaterThan(0);
    }
  });

  it("has no duplicate characters", () => {
    expect(new Set(chars(real.kanji)).size).toBe(real.kanji.length);
  });

  it("links compatibility-ideograph forms to their standard character", () => {
    const old = real.kanji.find((k) => k.character === "神");
    expect(old?.variantOf).toBe("神");
    expect(real.kanji.find((k) => k.character === "神")?.variantOf).toBeNull();
  });

  it("includes all 2,136 jōyō kanji", () => {
    const joyo = real.kanji.filter((k) => k.grade !== null && k.grade <= 8);
    expect(joyo).toHaveLength(2136);
  });
});
