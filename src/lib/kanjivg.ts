// Parses KanjiVG component groups into a tree. Used by scripts/build-data.mts,
// so this module must not import anything.

/** One KanjiVG <g> group: a component and the strokes that draw it. */
export interface ComponentNode {
  /** The component's character, e.g. 氵. Absent for unnamed groupings. */
  element?: string;
  /** For variant forms, the character this is a form of (氵 → 水). */
  original?: string;
  /** Where it sits in its parent: left, right, top, bottom, kamae, … */
  position?: string;
  /** KanjiVG's radical marker: general (modern dictionaries), tradit, or nelson. */
  radical?: string;
  /** KanjiVG marks this group as the phonetic (sound) component; the value names it. */
  phon?: string;
  /** Only part of the original component appears here (毎 contains part of 母). */
  partial?: true;
  /** 0-based indices of the strokes this component covers, ascending. */
  strokes: number[];
  children: ComponentNode[];
}

interface RawNode extends ComponentNode {
  part?: number;
  children: RawNode[];
}

const TOKEN = /<g\b([^>]*)>|<\/g>|<path\b([^>]*?)\/?>/g;
const ATTR = /([\w:]+)="([^"]*)"/g;

function attrs(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(ATTR)].map(([, k, v]) => [k, v]));
}

/**
 * Parses the body of one KanjiVG <kanji> element. The outermost group is the
 * kanji itself; components split into numbered parts (kvg:part, e.g. the two
 * halves of 二 inside 五) are merged into one node.
 */
export function parseComponents(kanjiBody: string): ComponentNode | null {
  const stack: RawNode[] = [];
  let root: RawNode | null = null;

  for (const [token, gAttrs, pathAttrs] of kanjiBody.matchAll(TOKEN)) {
    if (token.startsWith("</")) {
      stack.pop();
    } else if (gAttrs !== undefined) {
      const a = attrs(gAttrs);
      const node: RawNode = { strokes: [], children: [] };
      if (a["kvg:element"]) node.element = a["kvg:element"];
      if (a["kvg:original"]) node.original = a["kvg:original"];
      if (a["kvg:position"]) node.position = a["kvg:position"];
      if (a["kvg:radical"]) node.radical = a["kvg:radical"];
      if (a["kvg:phon"]) node.phon = a["kvg:phon"];
      if (a["kvg:partial"] === "true") node.partial = true;
      if (a["kvg:part"]) node.part = Number(a["kvg:part"]);
      if (stack.length) stack[stack.length - 1].children.push(node);
      else root ??= node;
      stack.push(node);
    } else {
      const stroke = /-s(\d+)$/.exec(attrs(pathAttrs).id ?? "");
      if (!stroke) continue;
      // A stroke belongs to every group it's nested in.
      for (const node of stack) node.strokes.push(Number(stroke[1]) - 1);
    }
  }

  if (!root) return null;
  mergeParts(root);
  return strip(root);
}

/**
 * Merges every group of same-element part nodes into its shallowest member.
 * Later parts are removed from their parents; their non-part children move to
 * the merged node.
 */
function mergeParts(root: RawNode) {
  const order: { node: RawNode; parent: RawNode | null }[] = [];
  const queue: { node: RawNode; parent: RawNode | null }[] = [{ node: root, parent: null }];
  while (queue.length) {
    const entry = queue.shift()!;
    order.push(entry);
    for (const child of entry.node.children) queue.push({ node: child, parent: entry.node });
  }

  const groups = new Map<string, { node: RawNode; parent: RawNode | null }[]>();
  for (const entry of order) {
    if (entry.node.part === undefined || !entry.node.element) continue;
    const key = entry.node.element;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  for (const [first, ...rest] of groups.values()) {
    for (const { node, parent } of rest) {
      first.node.strokes = [...new Set([...first.node.strokes, ...node.strokes])].sort(
        (a, b) => a - b,
      );
      first.node.children.push(...node.children.filter((c) => c.part === undefined));
      if (parent) parent.children = parent.children.filter((c) => c !== node);
    }
  }
}

/** Drops the internal `part` field throughout the tree. */
function strip(raw: RawNode): ComponentNode {
  const node: ComponentNode & { part?: number } = { ...raw, children: raw.children.map(strip) };
  delete node.part;
  return node;
}
