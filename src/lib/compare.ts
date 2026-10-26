import { componentsOf } from "./component-index";
import type { ComponentNode } from "./kanjivg";
import { normalizeReading } from "./search";

export const MAX_COMPARE = 4;
const IDEOGRAPH = /\p{Script=Han}/u;

/** The distinct kanji in a `?k=` value, in order, at most MAX_COMPARE. */
export function parseCompareParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join("") : (value ?? "");
  return [...new Set([...raw].filter((c) => IDEOGRAPH.test(c)))].slice(0, MAX_COMPARE);
}

export const compareHref = (chars: string[]) => `/compare?k=${encodeURIComponent(chars.join(""))}`;

export interface CompareInput {
  character: string;
  tree: ComponentNode | null;
  onyomi: string[];
  kunyomi: string[];
}

export interface Comparison {
  /** Components (at any depth) that every kanji contains. */
  shared: string[];
  /** Per kanji, its top-level components that the others don't all have. */
  distinct: Record<string, string[]>;
  /** Readings (kana) that more than one of the kanji has. */
  sharedReadings: string[];
}

const topLevel = (tree: ComponentNode | null) =>
  (tree?.children ?? []).flatMap((c) => (c.element ? [c.element] : []));

export function compareKanji(items: CompareInput[]): Comparison {
  const sets = items.map((i) => (i.tree ? componentsOf(i.tree) : new Set<string>()));
  // Keep the first kanji's ordering for readability.
  const shared = items.length > 1 ? [...sets[0]].filter((c) => sets.every((s) => s.has(c))) : [];
  const sharedSet = new Set(shared);

  const distinct: Record<string, string[]> = {};
  for (const item of items) distinct[item.character] = topLevel(item.tree).filter((c) => !sharedSet.has(c));

  const readingCounts = new Map<string, number>();
  for (const item of items) {
    const readings = new Set([...item.onyomi, ...item.kunyomi].map(normalizeReading));
    for (const r of readings) readingCounts.set(r, (readingCounts.get(r) ?? 0) + 1);
  }
  const sharedReadings = [...readingCounts].filter(([, n]) => n > 1).map(([r]) => r);

  return { shared, distinct, sharedReadings };
}
