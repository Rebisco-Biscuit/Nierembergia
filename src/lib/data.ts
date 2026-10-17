import "server-only";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import strokesJson from "@/data/strokes.json";
import vocabJson from "@/data/vocab.json";
import componentsJson from "@/data/components.json";
import { decompose, type DecomposedComponent } from "./decomposition";
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
      ? decompose(kanji, components[character], { kanjiByChar, radicals: dataset.radicals })
      : null,
  };
}
