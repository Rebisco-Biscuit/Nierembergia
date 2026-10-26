import type { ComponentIndex } from "./component-index";
import type { ComponentNode } from "./kanjivg";

/**
 * A kanji's components with weights: top-level components count double,
 * since they shape the overall look more than parts nested inside them.
 */
export function weightedComponents(root: ComponentNode): Map<string, number> {
  const weights = new Map<string, number>();
  const walk = (node: ComponentNode, depth: number) => {
    if (node.element && node.element !== root.element) {
      weights.set(node.element, Math.max(weights.get(node.element) ?? 0, depth === 1 ? 2 : 1));
    }
    node.children.forEach((c) => walk(c, depth + 1));
  };
  root.children.forEach((c) => walk(c, 1));
  return weights;
}

/** Weighted Jaccard similarity of two component sets, 0–1. */
function jaccard(a: Map<string, number>, b: Map<string, number>): number {
  let shared = 0;
  let total = 0;
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const wa = a.get(key) ?? 0;
    const wb = b.get(key) ?? 0;
    shared += Math.min(wa, wb);
    total += Math.max(wa, wb);
  }
  return total ? shared / total : 0;
}

/**
 * How alike two kanji look, 0–1: mostly shared components, scaled down as
 * their stroke counts drift apart. A heuristic, not a measure of confusion.
 */
export function visualSimilarity(
  a: { tree: ComponentNode; strokes: number },
  b: { tree: ComponentNode; strokes: number },
): number {
  const components = jaccard(weightedComponents(a.tree), weightedComponents(b.tree));
  const strokeGap = Math.min(Math.abs(a.strokes - b.strokes), 6);
  return components * (1 - strokeGap / 12);
}

export const SIMILARITY_THRESHOLD = 0.36;

/**
 * Kanji that look most like `kanji`: candidates share at least one
 * top-level component; ties go to the more frequent (earlier in `rank`).
 */
export function similarKanji(
  kanji: string,
  trees: Record<string, ComponentNode>,
  strokesOf: (char: string) => number,
  index: ComponentIndex,
  rank: Map<string, number>,
  limit: number,
): { character: string; score: number }[] {
  const tree = trees[kanji];
  if (!tree || tree.children.length === 0) return [];
  const self = { tree, strokes: strokesOf(kanji) };

  const candidates = new Set<string>();
  for (const top of tree.children) {
    if (top.element) for (const k of index.get(top.element) ?? []) candidates.add(k);
  }
  candidates.delete(kanji);

  return [...candidates]
    .flatMap((c) => {
      const other = trees[c];
      if (!other) return [];
      const score = visualSimilarity(self, { tree: other, strokes: strokesOf(c) });
      return score >= SIMILARITY_THRESHOLD ? [{ character: c, score }] : [];
    })
    .sort((x, y) => y.score - x.score || (rank.get(x.character) ?? 1e9) - (rank.get(y.character) ?? 1e9))
    .slice(0, limit);
}
