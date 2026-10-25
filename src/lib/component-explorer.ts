import { radicalNumberOf } from "./decomposition";
import type { ComponentNode } from "./kanjivg";
import type { Kanji, Radical } from "./types";

/** How one kanji uses a component. */
export interface ComponentUse {
  kanji: string;
  /**
   * Where the component sits: its own KanjiVG position, or the nearest
   * enclosing group's (口 inside 言 on the left of 語 counts as "left").
   * null when KanjiVG gives none.
   */
  position: string | null;
  /** The kanji's other top-level components, e.g. 青 for 氵 in 清. */
  partners: string[];
}

/**
 * For every component, how each kanji containing it uses it. Each kanji is
 * listed once per component, at the component's shallowest occurrence, in
 * `order` (frequency order).
 */
export function buildComponentUses(
  trees: Record<string, ComponentNode>,
  order: string[],
): Map<string, ComponentUse[]> {
  const uses = new Map<string, ComponentUse[]>();
  for (const kanji of order) {
    const root = trees[kanji];
    if (!root) continue;
    const seen = new Set<string>();
    const top = root.children;
    // Breadth-first, so the shallowest occurrence of each component wins.
    const queue = top.map((node, i) => ({ node, topIndex: i, position: node.position ?? null }));
    while (queue.length) {
      const { node, topIndex, position } = queue.shift()!;
      const element = node.element;
      if (element && element !== kanji && !seen.has(element)) {
        seen.add(element);
        const partners = top
          .filter((t, i) => i !== topIndex && t.element && t.element !== element)
          .map((t) => t.element!);
        if (!uses.has(element)) uses.set(element, []);
        uses.get(element)!.push({ kanji, position, partners: [...new Set(partners)] });
      }
      for (const child of node.children) {
        queue.push({ node: child, topIndex, position: child.position ?? position });
      }
    }
  }
  return uses;
}

export interface CatalogEntry {
  character: string;
  name: string | null;
  radicalNumber: number | null;
  /** How many kanji contain it. */
  count: number;
}

/** Every component, most used first. */
export function buildCatalog(
  uses: Map<string, ComponentUse[]>,
  nameOf: (char: string) => string | null,
  radicals: Radical[],
): CatalogEntry[] {
  return [...uses.entries()]
    .map(([character, list]) => ({
      character,
      name: nameOf(character),
      radicalNumber: radicalNumberOf(character, radicals),
      count: list.length,
    }))
    .sort((a, b) => b.count - a.count || a.character.localeCompare(b.character));
}

const RADICAL_QUERY = /^(?:r|rad|radical)?\s*[:#]?\s*(\d{1,3})$/i;
const IDEOGRAPH = /[\p{Script=Han}⺀-⿟㇀-㇯]/u;

/**
 * Searches the catalog by character (radical variants match each other, so
 * 水 also finds 氵), by English name (whole words), or by radical number
 * ("85", "r:85"). Keeps catalog order (most used first).
 */
export function searchCatalog(query: string, catalog: CatalogEntry[], radicals: Radical[]): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;

  const number = RADICAL_QUERY.exec(q);
  if (number) return catalog.filter((c) => c.radicalNumber === Number(number[1]));

  if (IDEOGRAPH.test(q)) {
    const chars = new Set([...q].filter((c) => IDEOGRAPH.test(c)));
    const radicalNumbers = new Set(
      [...chars].map((c) => radicalNumberOf(c, radicals)).filter((n): n is number => n !== null),
    );
    return catalog.filter(
      (c) => chars.has(c.character) || (c.radicalNumber !== null && radicalNumbers.has(c.radicalNumber)),
    );
  }

  const word = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  return catalog.filter((c) => c.name !== null && word.test(c.name.toLowerCase()));
}

/** Counts per value, most common first; ties keep first-seen order. */
export function tally<T>(values: T[]): { value: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/** A kanji containing a component, with what the component page filters on. */
export interface ComponentUseItem {
  character: string;
  meaning: string;
  jlpt: Kanji["jlpt"];
  strokes: number;
  frequency: number | null;
  position: string | null;
  partners: string[];
}
