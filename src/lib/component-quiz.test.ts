import { describe, expect, it } from "vitest";
import componentsJson from "@/data/components.json";
import kanjiJson from "@/data/kanji.json";
import { buildComponentIndex, componentsOf } from "./component-index";
import { makeComponentQuestion } from "./component-quiz";
import type { ComponentNode } from "./kanjivg";
import { seededRandom } from "./random";
import { similarKanji } from "./similarity";
import { COMPONENT_KINDS, OPTION_COUNT, makeQuiz, toStudyKanji, type StudyKanji } from "./study";
import type { Kanji } from "./types";

const kanji = kanjiJson as Kanji[];
const trees = componentsJson as Record<string, ComponentNode>;
const order = kanji.map((k) => k.character);
const index = buildComponentIndex(trees, order);
const rank = new Map(order.map((c, i) => [c, i]));
const strokes = new Map(kanji.map((k) => [k.character, k.strokes]));

// The same extras the study page sends to the browser.
const pool: StudyKanji[] = kanji.map((k) => {
  const tree = trees[k.character];
  return toStudyKanji(k, {
    parts: (tree?.children ?? []).flatMap((c) => (c.element ? [c.element] : [])),
    components: tree ? [...componentsOf(tree)] : [],
    similar: similarKanji(k.character, trees, (c) => strokes.get(c) ?? 0, index, rank, 4).map((s) => s.character),
  });
});
const get = (c: string) => pool.find((k) => k.character === c)!;
const labels = (q: { options: { label: string }[] }) => q.options.map((o) => o.label);

describe("missing part", () => {
  it("hides one of the target's parts and offers it among other parts", () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = makeComponentQuestion("missing", get("語"), pool, seededRandom(seed))!;
      expect(q.parts).toHaveLength(2);
      const hidden = ["言", "吾"][q.parts!.indexOf(null)];
      expect(q.options[q.answer].label).toBe(hidden);
      expect(q.options).toHaveLength(OPTION_COUNT);
      // No distractor is one of 語's own parts.
      expect(labels(q).filter((l) => ["言", "吾"].includes(l))).toEqual([hidden]);
    }
  });

  it("needs at least two parts", () => {
    expect(makeComponentQuestion("missing", get("一"), pool, seededRandom(1))).toBeNull();
  });
});

describe("contains", () => {
  it("asks for the kanji with a part, and no distractor contains it at any depth", () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = makeComponentQuestion("contains", get("清"), pool, seededRandom(seed))!;
      expect(["氵", "青"]).toContain(q.component);
      expect(q.options[q.answer].label).toBe("清");
      for (const [i, o] of q.options.entries()) {
        if (i !== q.answer) expect(o.kanji!.components).not.toContain(q.component);
      }
    }
  });
});

describe("build", () => {
  const key = (k: StudyKanji) => [...(k.parts ?? [])].sort().join("");

  it("asks which kanji the parts build", () => {
    const q = makeComponentQuestion("build", get("語"), pool, seededRandom(1))!;
    expect(q.parts).toEqual(["言", "吾"]);
    expect(q.options[q.answer].label).toBe("語");
  });

  it("never offers a kanji built from the same parts as a wrong answer", () => {
    // Find real twins: different kanji with identical top-level parts.
    const byKey = new Map<string, StudyKanji[]>();
    for (const k of pool) if ((k.parts?.length ?? 0) >= 2) byKey.set(key(k), [...(byKey.get(key(k)) ?? []), k]);
    const twins = [...byKey.values()].filter((g) => g.length > 1).slice(0, 10);
    expect(twins.length).toBeGreaterThan(0);
    for (const [a, b] of twins) {
      for (let seed = 0; seed < 10; seed++) {
        const q = makeComponentQuestion("build", a, pool, seededRandom(seed));
        if (!q) continue;
        expect(labels(q)).not.toContain(b.character);
        for (const [i, o] of q.options.entries()) if (i !== q.answer) expect(key(o.kanji!)).not.toBe(key(a));
      }
    }
  });

  it("needs at least two parts (末 is 木 plus a nested stroke)", () => {
    expect(makeComponentQuestion("build", get("末"), pool, seededRandom(1))).toBeNull();
  });

  it("prefers look-alikes as distractors", () => {
    const q = makeComponentQuestion("build", get("待"), pool, seededRandom(3))!;
    expect(labels(q).filter((l) => ["持", "特", "侍", "時", "峙"].includes(l)).length).toBeGreaterThan(0);
  });
});

describe("look-alike", () => {
  it("offers look-alikes that don't share the meaning", () => {
    for (let seed = 0; seed < 20; seed++) {
      const target = get("待");
      const q = makeComponentQuestion("lookalike", target, pool, seededRandom(seed))!;
      expect(q.options[q.answer].label).toBe("待");
      for (const [i, o] of q.options.entries()) {
        if (i === q.answer) continue;
        expect(o.kanji!.meanings.map((m) => m.toLowerCase())).not.toContain(target.meanings[0].toLowerCase());
      }
      expect(labels(q).some((l) => target.similar!.includes(l))).toBe(true);
    }
  });

  it("needs look-alikes", () => {
    expect(makeComponentQuestion("lookalike", get("一"), pool, seededRandom(1))).toBeNull();
  });
});

describe("makeQuiz with component kinds", () => {
  it("mixes component questions and skips kanji that can't be asked", () => {
    const deck = ["語", "清", "待", "末", "一", "人"].map(get);
    const quiz = makeQuiz(deck, pool, 6, COMPONENT_KINDS, seededRandom(4));
    expect(quiz.length).toBeGreaterThanOrEqual(4);
    expect(quiz.every((q) => COMPONENT_KINDS.includes(q.kind as (typeof COMPONENT_KINDS)[number]))).toBe(true);
    for (const q of quiz) {
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(labels(q)).size).toBe(OPTION_COUNT);
    }
  });

  it("works without extras: component kinds are just skipped", () => {
    const bare = kanji.slice(0, 50).map((k) => toStudyKanji(k));
    expect(makeQuiz(bare, bare, 5, COMPONENT_KINDS, seededRandom(1))).toEqual([]);
  });
});
