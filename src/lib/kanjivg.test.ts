import { describe, expect, it } from "vitest";
import { parseComponents, type ComponentNode } from "./kanjivg";

const path = (id: string) => `<path id="kvg:${id}" kvg:type="㇐" d="M1,1c2,2,3,3"/>`;

// Abridged from KanjiVG's 語: 言 on the left, phonetic 吾 on the right, and
// 五 inside 吾 written as two halves of 二 around other strokes.
const GO = `
<g id="kvg:08a9e" kvg:element="語">
  <g id="kvg:08a9e-g1" kvg:element="言" kvg:position="left" kvg:radical="general">
    ${path("08a9e-s1")}${path("08a9e-s2")}
  </g>
  <g id="kvg:08a9e-g3" kvg:element="吾" kvg:position="right" kvg:phon="吾">
    <g id="kvg:08a9e-g4" kvg:element="五">
      <g id="kvg:08a9e-g5" kvg:element="二" kvg:part="1">${path("08a9e-s3")}</g>
      ${path("08a9e-s4")}
      <g id="kvg:08a9e-g6" kvg:element="二" kvg:part="2">${path("08a9e-s5")}</g>
    </g>
    <g id="kvg:08a9e-g7" kvg:element="口">${path("08a9e-s6")}</g>
  </g>
</g>`;

const elements = (node: ComponentNode): string[] => node.children.map((c) => c.element ?? "?");

describe("parseComponents", () => {
  const root = parseComponents(GO)!;

  it("returns the kanji as the root with all its strokes", () => {
    expect(root.element).toBe("語");
    expect(root.strokes).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("builds the component hierarchy with positions", () => {
    expect(elements(root)).toEqual(["言", "吾"]);
    expect(root.children.map((c) => c.position)).toEqual(["left", "right"]);
    expect(elements(root.children[1])).toEqual(["五", "口"]);
  });

  it("assigns each group the strokes nested inside it", () => {
    expect(root.children[0].strokes).toEqual([0, 1]);
    expect(root.children[1].strokes).toEqual([2, 3, 4, 5]);
  });

  it("keeps radical and phonetic markers", () => {
    expect(root.children[0].radical).toBe("general");
    expect(root.children[1].phon).toBe("吾");
    expect(root.children[0].phon).toBeUndefined();
  });

  it("merges split parts into one component", () => {
    const go = root.children[1].children[0];
    expect(elements(go)).toEqual(["二"]);
    expect(go.children[0].strokes).toEqual([2, 4]);
    expect(go.children[0]).not.toHaveProperty("part");
  });

  it("keeps variant forms and their originals", () => {
    const umi = parseComponents(`
      <g id="kvg:06d77" kvg:element="海">
        <g id="kvg:06d77-g1" kvg:element="氵" kvg:variant="true" kvg:original="水" kvg:position="left">${path("06d77-s1")}</g>
      </g>`)!;
    expect(umi.children[0]).toMatchObject({ element: "氵", original: "水" });
  });

  it("returns null when there are no groups", () => {
    expect(parseComponents("")).toBeNull();
  });
});
