import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import { buildComponentIndex } from "./component-index";
import type { ComponentNode } from "./kanjivg";
import { SIMILARITY_THRESHOLD, similarKanji, visualSimilarity, weightedComponents } from "./similarity";
import type { Kanji } from "./types";

const kanji = kanjiJson as Kanji[];
const trees = componentsJson as Record<string, ComponentNode>;
const order = kanji.map((k) => k.character);
const index = buildComponentIndex(trees, order);
const rank = new Map(order.map((c, i) => [c, i]));
const strokes = new Map(kanji.map((k) => [k.character, k.strokes]));
const strokesOf = (c: string) => strokes.get(c) ?? 0;
const similar = (c: string, limit = 10) => similarKanji(c, trees, strokesOf, index, rank, limit).map((s) => s.character);
const sim = (a: string, b: string) =>
  visualSimilarity({ tree: trees[a], strokes: strokesOf(a) }, { tree: trees[b], strokes: strokesOf(b) });

describe("weightedComponents", () => {
  it("weights top-level components double", () => {
    const w = weightedComponents(trees["語"]);
    expect(w.get("言")).toBe(2);
    expect(w.get("吾")).toBe(2);
    expect(w.get("五")).toBe(1);
    expect(w.has("語")).toBe(false);
  });
});

describe("visualSimilarity", () => {
  it("is 1 for a kanji compared with itself", () => {
    expect(sim("待", "待")).toBe(1);
  });

  it("is symmetric", () => {
    expect(sim("待", "持")).toBeCloseTo(sim("持", "待"));
  });

  it("scores kanji sharing a big component above unrelated ones", () => {
    expect(sim("待", "持")).toBeGreaterThan(SIMILARITY_THRESHOLD);
    expect(sim("待", "海")).toBeLessThan(0.1);
  });
});

describe("similarKanji", () => {
  it("finds the 寺 family for 待", () => {
    expect(similar("待")).toEqual(expect.arrayContaining(["持", "特", "侍"]));
  });

  it("finds the 青 family for 清", () => {
    expect(similar("清")).toEqual(expect.arrayContaining(["情", "晴", "精"]));
  });

  it("puts classic look-alikes first", () => {
    expect(similar("末")[0]).toBe("未");
    expect(similar("鳥")[0]).toBe("馬");
    expect(similar("右")).toContain("石");
  });

  it("drops weak matches below the threshold", () => {
    for (const s of similarKanji("清", trees, strokesOf, index, rank, 50)) {
      expect(s.score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    }
  });

  it("never lists the kanji itself and respects the limit", () => {
    const list = similar("清", 3);
    expect(list).toHaveLength(3);
    expect(list).not.toContain("清");
  });

  it("returns nothing for a kanji KanjiVG doesn't split", () => {
    expect(similar("一")).toEqual([]);
  });

  it("orders by similarity", () => {
    const scores = similarKanji("待", trees, strokesOf, index, rank, 10).map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
