import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import { compareHref, compareKanji, parseCompareParam } from "./compare";
import type { ComponentNode } from "./kanjivg";
import type { Kanji } from "./types";

const trees = componentsJson as Record<string, ComponentNode>;
const byChar = new Map((kanjiJson as Kanji[]).map((k) => [k.character, k]));
const input = (c: string) => ({
  character: c,
  tree: trees[c] ?? null,
  onyomi: byChar.get(c)!.onyomi,
  kunyomi: byChar.get(c)!.kunyomi,
});

describe("parseCompareParam", () => {
  it("keeps distinct kanji in order, up to four", () => {
    expect(parseCompareParam("待持待特侍時")).toEqual(["待", "持", "特", "侍"]);
  });

  it("ignores non-kanji and handles repeated params", () => {
    expect(parseCompareParam("a待 ,持!")).toEqual(["待", "持"]);
    expect(parseCompareParam(["待", "持"])).toEqual(["待", "持"]);
    expect(parseCompareParam(undefined)).toEqual([]);
  });

  it("round-trips through compareHref", () => {
    const href = compareHref(["待", "持"]);
    expect(parseCompareParam(decodeURIComponent(href.split("=")[1]))).toEqual(["待", "持"]);
  });
});

describe("compareKanji", () => {
  it("finds what the 寺 family shares and what sets each apart", () => {
    const c = compareKanji(["待", "持", "特"].map(input));
    expect(c.shared).toEqual(expect.arrayContaining(["寺", "土", "寸"]));
    expect(c.distinct["待"]).toEqual(["彳"]);
    expect(c.distinct["持"]).toEqual(["扌"]);
    expect(c.distinct["特"]).toEqual(["牛"]);
  });

  it("finds readings shared through a phonetic component", () => {
    // 清 (セイ) and 晴 (セイ) share their sound through 青.
    expect(compareKanji(["清", "晴"].map(input)).sharedReadings).toContain("せい");
  });

  it("shares nothing for unrelated kanji", () => {
    const c = compareKanji(["水", "語"].map(input));
    expect(c.shared).toEqual([]);
  });

  it("handles a single kanji", () => {
    expect(compareKanji([input("語")]).shared).toEqual([]);
  });
});
