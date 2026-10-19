import "server-only";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import strokesJson from "@/data/strokes.json";
import vocabJson from "@/data/vocab.json";
import componentsJson from "@/data/components.json";
import { buildComponentIndex, relatedByComponent } from "./component-index";
import { decompose, meaningOf, radicalNumberOf, type DecomposedComponent } from "./decomposition";
import type { ComponentNode } from "./kanjivg";
import type { Dataset, Kanji, Radical } from "./types";
import type { VocabWord } from "./vocab";

export const dataset: Dataset = {
  kanji: kanjiJson as Kanji[],
  radicals: radicalsJson as Radical[],
};

export const radicalByNumber = new Map(dataset.radicals.map((r) => [r.number, r]));

const kanjiByChar = new Map(dataset.kanji.map((k) => [k.character, k]));
const vocab = vocabJson as Record<string, VocabWord[]>;
const strokes = strokesJson as Record<string, string[]>;
const components = componentsJson as Record<string, ComponentNode>;
export const componentIndex = buildComponentIndex(
  components,
  dataset.kanji.map((k) => k.character),
);

const decompositionContext = { kanjiByChar, radicals: dataset.radicals, componentIndex };

export interface ComponentDetail {
  character: string;
  name: string | null;
  /** The component as a kanji in its own right, if it is one. */
  asKanji: Kanji | null;
  /** The Kangxi radical this component is (a form of), if any. */
  radical: Radical | null;
  /** Other forms of the same radical that also appear as components. */
  otherForms: string[];
  /** Kanji containing the component, most frequent first. */
  usedIn: Kanji[];
}

export function getComponentDetail(character: string): ComponentDetail | null {
  const usedIn = componentIndex.get(character);
  if (!usedIn) return null;
  const radicalNumber = radicalNumberOf(character, dataset.radicals);
  const radical = radicalNumber ? radicalByNumber.get(radicalNumber)! : null;
  return {
    character,
    name: meaningOf(character, decompositionContext),
    asKanji: kanjiByChar.get(character) ?? null,
    radical,
    otherForms: radical
      ? [radical.character, ...radical.variants].filter(
          (f) => f !== character && componentIndex.has(f),
        )
      : [],
    usedIn: usedIn.map((c) => kanjiByChar.get(c)!),
  };
}

export interface KanjiDetail {
  kanji: Kanji;
  radical: Radical;
  vocabulary: VocabWord[];
  /** SVG path data per stroke, in order; null if KanjiVG has no diagram. */
  strokes: string[] | null;
  /** Traditional forms that point at this kanji via `variantOf`. */
  traditionalForms: Kanji[];
  /**
   * The kanji's direct components; empty if KanjiVG treats it as a single
   * component, null if KanjiVG has no data for it.
   */
  components: DecomposedComponent[] | null;
  /** Other kanji sharing each direct component; sound components first. */
  related: { component: string; name: string | null; kanji: Kanji[]; total: number }[];
  /** Kanji that contain this kanji as a component (first few), and how many in all. */
  usedIn: { kanji: Kanji[]; total: number };
}

const RELATED_PER_COMPONENT = 12;
const USED_IN_SHOWN = 24;

export function getKanjiDetail(character: string): KanjiDetail | null {
  const kanji = kanjiByChar.get(character);
  if (!kanji) return null;
  const decomposed = components[character]
    ? decompose(kanji, components[character], decompositionContext)
    : null;
  const direct = (decomposed ?? []).filter((c) => c.character);
  const isSound = (char: string) =>
    direct.some((c) => c.character === char && c.roles.some((r) => r.kind === "phonetic"));
  const related = relatedByComponent(
    character,
    direct.map((c) => c.character!),
    componentIndex,
    RELATED_PER_COMPONENT,
  )
    .sort((a, b) => Number(isSound(b.component)) - Number(isSound(a.component)))
    .map((g) => ({
      component: g.component,
      name: meaningOf(g.component, decompositionContext),
      kanji: g.kanji.map((c) => kanjiByChar.get(c)!),
      total: g.total,
    }));
  const containing = componentIndex.get(character) ?? [];

  return {
    kanji,
    radical: radicalByNumber.get(kanji.radical)!,
    vocabulary: vocab[character] ?? [],
    strokes: strokes[character] ?? null,
    traditionalForms: dataset.kanji.filter((k) => k.variantOf === character),
    components: decomposed,
    related,
    usedIn: {
      kanji: containing.slice(0, USED_IN_SHOWN).map((c) => kanjiByChar.get(c)!),
      total: containing.length,
    },
  };
}
