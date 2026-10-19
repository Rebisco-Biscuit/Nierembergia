import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import { buildComponentIndex, componentsOf, relatedByComponent } from "./component-index";
import type { ComponentNode } from "./kanjivg";
import type { Kanji } from "./types";

const node = (element: string | undefined, children: ComponentNode[] = []): ComponentNode => ({
  ...(element && { element }),
  strokes: [0],
  children,
});

const trees: Record<string, ComponentNode> = {
  語: node("語", [node("言", [node("口")]), node("吾", [node("五"), node("口")])]),
  悟: node("悟", [node("忄"), node("吾", [node("五"), node("口")])]),
  口: node("口"),
  樹: node("樹", [node("木"), node(undefined, [node("寸")])]),
};

describe("buildComponentIndex", () => {
  const index = buildComponentIndex(trees, ["語", "悟", "口", "樹"]);

  it("lists the kanji containing each component, in the given order", () => {
    expect(index.get("吾")).toEqual(["語", "悟"]);
    expect(index.get("言")).toEqual(["語"]);
  });

  it("finds components nested at any depth, once per kanji", () => {
    expect(index.get("口")).toEqual(["語", "悟"]);
    expect(index.get("五")).toEqual(["語", "悟"]);
  });

  it("looks through unnamed groups", () => {
    expect(index.get("寸")).toEqual(["樹"]);
  });

  it("never lists a kanji as containing itself", () => {
    expect(index.get("語")).toBeUndefined();
  });
});

describe("componentsOf", () => {
  it("collects distinct component characters below the root", () => {
    expect([...componentsOf(trees["語"])].sort()).toEqual(["五", "口", "吾", "言"].sort());
  });
});

describe("relatedByComponent", () => {
  const index = buildComponentIndex(trees, ["語", "悟", "口", "樹"]);

  it("groups other kanji by shared component, excluding the kanji itself", () => {
    expect(relatedByComponent("語", ["言", "吾"], index, 10)).toEqual([
      { component: "吾", kanji: ["悟"], total: 1 },
    ]);
  });

  it("limits each group but reports the full count", () => {
    const [group] = relatedByComponent("口", ["五"], index, 1);
    expect(group).toEqual({ component: "五", kanji: ["語"], total: 2 });
  });
});

describe("the real component index", () => {
  const kanji = kanjiJson as Kanji[];
  const index = buildComponentIndex(
    componentsJson as Record<string, ComponentNode>,
    kanji.map((k) => k.character),
  );

  it("finds the phonetic family of 青", () => {
    expect(index.get("青")).toEqual(expect.arrayContaining(["清", "晴", "精", "静", "請"]));
  });

  it("finds kanji built on 木", () => {
    expect(index.get("木")).toEqual(expect.arrayContaining(["林", "森", "校", "村"]));
  });

  it("lists more frequent kanji first", () => {
    const rank = new Map(kanji.map((k, i) => [k.character, i]));
    const list = index.get("氵")!;
    const ranks = list.map((c) => rank.get(c)!);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});
