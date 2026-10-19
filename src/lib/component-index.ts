import type { ComponentNode } from "./kanjivg";

/** Component character → the kanji that contain it anywhere in their tree. */
export type ComponentIndex = Map<string, string[]>;

/**
 * Builds the reverse index from KanjiVG trees. Each list follows `order`
 * (the dataset's frequency order) and never includes the kanji itself.
 */
export function buildComponentIndex(
  trees: Record<string, ComponentNode>,
  order: string[],
): ComponentIndex {
  const index: ComponentIndex = new Map();
  for (const kanji of order) {
    const root = trees[kanji];
    if (!root) continue;
    for (const element of componentsOf(root)) {
      if (element === kanji) continue;
      if (!index.has(element)) index.set(element, []);
      index.get(element)!.push(kanji);
    }
  }
  return index;
}

/** Every distinct component character below the root of a tree. */
export function componentsOf(root: ComponentNode): Set<string> {
  const found = new Set<string>();
  const walk = (node: ComponentNode) => {
    if (node.element) found.add(node.element);
    node.children.forEach(walk);
  };
  root.children.forEach(walk);
  return found;
}

export interface RelatedGroup {
  /** The shared component. */
  component: string;
  /** Other kanji containing it, most frequent first, up to the limit. */
  kanji: string[];
  /** How many other kanji contain it in total. */
  total: number;
}

/**
 * Kanji related to `kanji` through each of its direct components, so they
 * can be shown grouped by what they share.
 */
export function relatedByComponent(
  kanji: string,
  directComponents: string[],
  index: ComponentIndex,
  limit: number,
): RelatedGroup[] {
  const groups: RelatedGroup[] = [];
  for (const component of new Set(directComponents)) {
    const others = (index.get(component) ?? []).filter((k) => k !== kanji);
    if (others.length === 0) continue;
    groups.push({ component, kanji: others.slice(0, limit), total: others.length });
  }
  return groups;
}
