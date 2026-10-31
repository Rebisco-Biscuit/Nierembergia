import "server-only";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import strokesJson from "@/data/strokes.json";
import vocabJson from "@/data/vocab.json";
import componentsJson from "@/data/components.json";
import { buildCatalog, buildComponentUses, type ComponentUseItem } from "./component-explorer";
import { similarKanji } from "./similarity";
import { buildComponentIndex, componentsOf, relatedByComponent } from "./component-index";
import {
  buildSoundFamilies,
  decompose,
  meaningOf,
  radicalNumberOf,
  type DecomposedComponent,
  type SoundFamilyMember as SoundFamilyItem,
} from "./decomposition";
import type { ComponentNode } from "./kanjivg";
import { toStudyKanji, type StudyKanji } from "./study";
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

/** How each kanji uses each component (position, partner components). */
export const componentUses = buildComponentUses(
  components,
  dataset.kanji.map((k) => k.character),
);

/** All components, most used first, for the explorer. */
export const componentCatalog = buildCatalog(
  componentUses,
  (char) => meaningOf(char, decompositionContext),
  dataset.radicals,
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
  /** How each of those kanji uses it, for filtering by position or partner. */
  uses: ComponentUseItem[];
  /** Kanji that use it as their sound component, best reading match first. */
  soundFamily: SoundFamilyMember[];
}

export interface SoundFamilyMember extends Omit<SoundFamilyItem, "kanji"> {
  kanji: Kanji;
}

/** Component → the kanji that use it for sound, built on first use. */
let soundFamilies: Map<string, SoundFamilyItem[]> | null = null;
const soundFamilyOf = (character: string): SoundFamilyMember[] => {
  soundFamilies ??= buildSoundFamilies(dataset.kanji, components, decompositionContext);
  return (soundFamilies.get(character) ?? []).map((m) => ({ ...m, kanji: kanjiByChar.get(m.kanji)! }));
};


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
    uses: (componentUses.get(character) ?? []).map((u) => {
      const k = kanjiByChar.get(u.kanji)!;
      return {
        character: k.character,
        meaning: k.meanings[0] ?? "",
        jlpt: k.jlpt,
        strokes: k.strokes,
        frequency: k.frequency,
        position: u.position,
        partners: u.partners,
      };
    }),
    soundFamily: soundFamilyOf(character),
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
  /** Kanji that look alike, by shared components and stroke count (computed). */
  similar: Kanji[];
}

const RELATED_PER_COMPONENT = 12;
const USED_IN_SHOWN = 24;
const SIMILAR_SHOWN = 8;
const frequencyRank = new Map(dataset.kanji.map((k, i) => [k.character, i]));
const strokesOf = (char: string) => kanjiByChar.get(char)?.strokes ?? 0;

/** A kanji's KanjiVG component tree, if KanjiVG has one. */
export const getKanjiTree = (character: string): ComponentNode | null => components[character] ?? null;

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
  const similar = similarKanji(character, components, strokesOf, componentIndex, frequencyRank, SIMILAR_SHOWN);

  return {
    kanji,
    radical: radicalByNumber.get(kanji.radical)!,
    vocabulary: vocab[character] ?? [],
    strokes: strokes[character] ?? null,
    traditionalForms: dataset.kanji.filter((k) => k.variantOf === character),
    components: decomposed,
    related,
    similar: similar.map((s) => kanjiByChar.get(s.character)!),
    usedIn: {
      kanji: containing.slice(0, USED_IN_SHOWN).map((c) => kanjiByChar.get(c)!),
      total: containing.length,
    },
  };
}

const SIMILAR_FOR_STUDY = 4;

/**
 * Every kanji as sent to the study page, with the parts, components, and
 * look-alikes that component quiz questions need.
 */
export function getStudyKanji(): StudyKanji[] {
  return dataset.kanji.map((k) => {
    const tree = components[k.character];
    return toStudyKanji(k, {
      parts: (tree?.children ?? []).flatMap((c) => (c.element ? [c.element] : [])),
      components: tree ? [...componentsOf(tree)] : [],
      similar: similarKanji(k.character, components, strokesOf, componentIndex, frequencyRank, SIMILAR_FOR_STUDY).map(
        (s) => s.character,
      ),
    });
  });
}
