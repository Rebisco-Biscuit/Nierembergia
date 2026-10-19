import "server-only";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import strokesJson from "@/data/strokes.json";
import vocabJson from "@/data/vocab.json";
import componentsJson from "@/data/components.json";
import { buildComponentIndex } from "./component-index";
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
const decompositionContext = { kanjiByChar, radicals: dataset.radicals };

export const componentIndex = buildComponentIndex(
  components,
  dataset.kanji.map((k) => k.character),
);

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
}

export function getKanjiDetail(character: string): KanjiDetail | null {
  const kanji = kanjiByChar.get(character);
  if (!kanji) return null;
  return {
    kanji,
    radical: radicalByNumber.get(kanji.radical)!,
    vocabulary: vocab[character] ?? [],
    strokes: strokes[character] ?? null,
    traditionalForms: dataset.kanji.filter((k) => k.variantOf === character),
    components: components[character]
      ? decompose(kanji, components[character], decompositionContext)
      : null,
  };
}
