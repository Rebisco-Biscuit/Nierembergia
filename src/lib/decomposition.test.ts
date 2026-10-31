import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import {
  buildSoundFamilies,
  decompose,
  positionLabel,
  radicalNumberOf,
  type DecomposedComponent,
} from "./decomposition";
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

  it("counts the other kanji that contain each component", () => {
    const index = new Map([
      ["吾", ["語", "悟"]],
      ["言", ["語"]],
    ]);
    const [gon, go] = decompose(ctx.kanjiByChar.get("語")!, components["語"], {
      ...ctx,
      componentIndex: index,
    });
    expect(go.usedInCount).toBe(1); // 悟, not 語 itself
    expect(gon.usedInCount).toBe(0);
  });

  it("grades how the sound component's readings match", () => {
    const sound = (char: string) => of(char).flatMap((c) => c.roles).find((r) => r.kind === "phonetic")?.evidence;
    expect(sound("語")).toMatchObject({ component: "吾", match: "same", shared: ["ゴ"] });
    expect(sound("住")).toMatchObject({ component: "主", match: "close" });
    expect(sound("仮")).toMatchObject({ component: "反", match: "drifted" });
  });

  it("infers an unmarked sound component that shares the kanji's reading", () => {
    const [nin, rei] = of("伶");
    expect(roles(rei)).toEqual(["phonetic:inferred"]);
    expect(rei.roles[0].evidence?.shared).toEqual(["レイ"]);
    // The radical then carries the meaning, as for marked compounds.
    expect(roles(nin)).toEqual(["radical:KANJIDIC2", "semantic:inferred"]);
  });

  it("never infers the radical as the sound component", () => {
    // 叩 (コウ): 口 is read コウ too, but it's the radical.
    expect(of("叩").flatMap((c) => c.roles).filter((r) => r.kind === "phonetic")).toEqual([]);
  });

  it("leaves compounds with no shared reading alone", () => {
    expect(of("林").flatMap((c) => roles(c))).toEqual(["radical:KANJIDIC2"]);
  });

  it("returns no components for a kanji KanjiVG doesn't split", () => {
    expect(of("一")).toEqual([]);
  });
});

describe("buildSoundFamilies", () => {
  const families = buildSoundFamilies(kanji, components, ctx);

  it("collects the kanji that use a component for sound, best match first", () => {
    const sei = families.get("青")!;
    expect(sei.map((m) => m.kanji)).toEqual(expect.arrayContaining(["清", "晴", "精", "静"]));
    const order = ["same", "close", "drifted", null];
    const ranks = sei.map((m) => order.indexOf(m.match));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(sei.find((m) => m.kanji === "晴")).toMatchObject({ match: "same", inferred: false });
  });

  it("includes inferred sound components, flagged", () => {
    expect(families.get("令")!.find((m) => m.kanji === "伶")).toMatchObject({ match: "same", inferred: true });
  });

  it("leaves out components that are never a sound component", () => {
    expect(families.has("氵")).toBe(false);
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
