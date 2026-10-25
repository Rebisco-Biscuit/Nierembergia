import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import { buildCatalog, buildComponentUses, searchCatalog, tally } from "./component-explorer";
import type { ComponentNode } from "./kanjivg";
import type { Kanji, Radical } from "./types";

const kanji = kanjiJson as Kanji[];
const radicals = radicalsJson as Radical[];
const trees = componentsJson as Record<string, ComponentNode>;
const uses = buildComponentUses(trees, kanji.map((k) => k.character));
const kanjiByChar = new Map(kanji.map((k) => [k.character, k]));
const nameOf = (c: string) => kanjiByChar.get(c)?.meanings[0] ?? null;
const catalog = buildCatalog(uses, nameOf, radicals);

const useIn = (component: string, k: string) => uses.get(component)!.find((u) => u.kanji === k)!;

describe("buildComponentUses", () => {
  it("records the component's position in each kanji", () => {
    expect(useIn("氵", "清").position).toBe("left");
    expect(useIn("青", "清").position).toBe("right");
    expect(useIn("宀", "字").position).toBe("top");
  });

  it("inherits the enclosing group's position for nested components", () => {
    // 口 sits inside 言, which is on the left of 語.
    expect(useIn("口", "語").position).toBe("left");
  });

  it("lists the other top-level components as partners", () => {
    expect(useIn("氵", "清").partners).toEqual(["青"]);
    expect(useIn("青", "清").partners).toEqual(["氵"]);
  });

  it("lists each kanji once per component, at the shallowest occurrence", () => {
    // 口 appears twice in 語 (in 言 and in 吾).
    expect(uses.get("口")!.filter((u) => u.kanji === "語")).toHaveLength(1);
  });

  it("matches the component index's kanji counts", () => {
    expect(uses.get("青")!.map((u) => u.kanji)).toEqual(expect.arrayContaining(["清", "晴", "精", "静"]));
  });
});

describe("buildCatalog", () => {
  it("sorts by how many kanji use each component", () => {
    for (let i = 1; i < catalog.length; i++) {
      expect(catalog[i - 1].count).toBeGreaterThanOrEqual(catalog[i].count);
    }
  });

  it("names components and tags radicals", () => {
    const sanzui = catalog.find((c) => c.character === "氵")!;
    expect(sanzui.radicalNumber).toBe(85);
    expect(catalog.find((c) => c.character === "青")!.name).toBe("blue");
  });
});

describe("searchCatalog", () => {
  const chars = (q: string) => searchCatalog(q, catalog, radicals).map((c) => c.character);

  it("returns everything for an empty query", () => {
    expect(searchCatalog("  ", catalog, radicals)).toHaveLength(catalog.length);
  });

  it("finds a component and its radical variants by character", () => {
    expect(chars("水")).toEqual(expect.arrayContaining(["水", "氵"]));
    expect(chars("氵")).toEqual(expect.arrayContaining(["水", "氵"]));
  });

  it("finds components by radical number", () => {
    expect(chars("85")).toEqual(expect.arrayContaining(["水", "氵"]));
    expect(chars("r:85")).toEqual(chars("85"));
    expect(chars("r:85").every((c) => catalog.find((x) => x.character === c)!.radicalNumber === 85)).toBe(true);
  });

  it("finds components by English name at word starts", () => {
    expect(chars("blue")).toContain("青");
    expect(chars("lue")).not.toContain("青");
  });

  it("treats regex characters in names literally", () => {
    expect(() => searchCatalog("(", catalog, radicals)).not.toThrow();
  });
});

describe("tally", () => {
  it("counts values, most common first", () => {
    expect(tally(["a", "b", "a", "c", "a", "b"])).toEqual([
      { value: "a", count: 3 },
      { value: "b", count: 2 },
      { value: "c", count: 1 },
    ]);
  });
});
