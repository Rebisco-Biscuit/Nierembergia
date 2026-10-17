import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import strokesJson from "@/data/strokes.json";
import type { ComponentNode } from "./kanjivg";

const components = componentsJson as Record<string, ComponentNode>;
const strokes = strokesJson as Record<string, string[]>;

function* walk(node: ComponentNode, parent?: ComponentNode): Generator<[ComponentNode, ComponentNode | undefined]> {
  yield [node, parent];
  for (const child of node.children) yield* walk(child, node);
}

describe("generated component data", () => {
  it("has a tree for every kanji with stroke data", () => {
    expect(Object.keys(components).sort()).toEqual(Object.keys(strokes).sort());
  });

  it("roots each tree at the kanji, covering all of its strokes", () => {
    for (const [char, root] of Object.entries(components)) {
      expect(root.element, char).toBe(char);
      expect(root.strokes, char).toEqual(strokes[char].map((_, i) => i));
    }
  });

  it("almost always nests a component's strokes inside its parent's", () => {
    let nodes = 0;
    let escaping = 0;
    for (const root of Object.values(components)) {
      for (const [node, parent] of walk(root)) {
        expect(node.strokes.length).toBeGreaterThan(0);
        if (!parent) continue;
        nodes++;
        const parentStrokes = new Set(parent.strokes);
        if (node.strokes.some((s) => !parentStrokes.has(s))) escaping++;
      }
    }
    // Only merged split parts (kvg:part) can reach outside their parent, as
    // 豆 does inside 樹's interleaved 吉/豆.
    expect(escaping / nodes).toBeLessThan(0.01);
  });

  it("decomposes common compounds into their known parts", () => {
    const top = (char: string) => components[char].children.map((c) => c.element);
    expect(top("語")).toEqual(["言", "吾"]);
    expect(top("海")).toEqual(["氵", "毎"]);
    expect(top("字")).toEqual(["宀", "子"]);
  });

  it("marks phonetic components", () => {
    expect(components["語"].children[1].phon).toBe("吾");
    expect(components["清"].children[1].phon).toBe("青");
  });
});
