import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import { decompose, positionLabel, radicalNumberOf, type DecomposedComponent } from "./decomposition";
import type { ComponentNode } from "./kanjivg";
import type { Kanji, Radical } from "./types";

const kanji = kanjiJson as Kanji[];
const radicals = radicalsJson as Radical[];
const components = componentsJson as Record<string, ComponentNode>;
const ctx = { kanjiByChar: new Map(kanji.map((k) => [k.character, k])), radicals };

const of = (char: string) => decompose(ctx.kanjiByChar.get(char)!, components[char], ctx);
const roles = (c: DecomposedComponent) => c.roles.map((r) => `${r.kind}:${r.source}`);

describe("decompose", () => {
  it("names components by meaning or radical name", () => {
    const [gon, go] = of("語");
    expect(gon).toMatchObject({ character: "言", name: "say", radicalNumber: 149 });
    expect(go.character).toBe("吾");
    expect(go.radicalNumber).toBeNull();
  });

  it("describes variant forms by their original", () => {
    const [sanzui] = of("海");
    expect(sanzui).toMatchObject({ character: "氵", name: "form of 水 (water)", radicalNumber: 85 });
  });

  it("marks the radical, the phonetic, and the inferred semantic role", () => {
    const [sanzui, mai] = of("清");
    expect(roles(sanzui)).toEqual(["radical:KANJIDIC2", "semantic:inferred"]);
    expect(roles(mai)).toEqual(["phonetic:KanjiVG"]);
  });

  it("does not infer a semantic role without a phonetic component", () => {
    const [ki, ki2] = of("林");
    expect(roles(ki)).toEqual(["radical:KANJIDIC2"]);
    expect(roles(ki2)).toEqual([]);
  });

  it("marks only one component as the radical", () => {
    for (const char of ["林", "森", "品", "語", "街"]) {
      const all: DecomposedComponent[] = [];
      const walk = (c: DecomposedComponent) => {
        all.push(c);
        c.children.forEach(walk);
      };
      of(char).forEach(walk);
      expect(all.filter((c) => c.roles.some((r) => r.kind === "radical")), char).toHaveLength(1);
    }
  });

  it("notes when the phonetic differs from the component's own character", () => {
    const phon = of("樹")[1].roles.find((r) => r.kind === "phonetic");
    expect(phon?.note).toBe("Sound component: 土+豆+寸");
  });

  it("returns no components for a kanji KanjiVG doesn't split", () => {
    expect(of("一")).toEqual([]);
  });
});

describe("radicalNumberOf", () => {
  it("recognises radicals and their variant forms", () => {
    expect(radicalNumberOf("水", radicals)).toBe(85);
    expect(radicalNumberOf("氵", radicals)).toBe(85);
    expect(radicalNumberOf("吾", radicals)).toBeNull();
    expect(radicalNumberOf(undefined, radicals)).toBeNull();
  });
});

describe("positionLabel", () => {
  it("labels KanjiVG positions, including contained pieces", () => {
    expect(positionLabel("left")).toBe("left");
    expect(positionLabel("tarec")).toBe("inside");
    expect(positionLabel("⿵A")).toBeNull();
    expect(positionLabel(null)).toBeNull();
  });
});
