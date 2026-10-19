import type { ComponentNode } from "./kanjivg";
import type { Kanji, Radical } from "./types";

export type RoleKind = "radical" | "phonetic" | "semantic";

export interface Role {
  kind: RoleKind;
  /** Where the claim comes from. "inferred" means derived by this app, not stated by a source. */
  source: "KANJIDIC2" | "KanjiVG" | "inferred";
  note?: string;
}

export interface DecomposedComponent {
  /** The component's character, if KanjiVG names one. */
  character: string | null;
  /** Short description: a radical name, a kanji meaning, or "form of 水 (water)". */
  name: string | null;
  /** Set when the component is one of the 214 Kangxi radicals (in any of its forms). */
  radicalNumber: number | null;
  position: string | null;
  roles: Role[];
  strokes: number[];
  children: DecomposedComponent[];
}

export interface DecompositionContext {
  kanjiByChar: Map<string, Kanji>;
  radicals: Radical[];
}

export function radicalNumberOf(char: string | undefined, radicals: Radical[]): number | null {
  if (!char) return null;
  return radicals.find((r) => r.character === char || r.variants.includes(char))?.number ?? null;
}

/** A character's primary meaning as a kanji, else its radical name. */
export function meaningOf(char: string, ctx: DecompositionContext): string | null {
  const k = ctx.kanjiByChar.get(char);
  if (k?.meanings[0]) return k.meanings[0];
  const n = radicalNumberOf(char, ctx.radicals);
  return n ? ctx.radicals[n - 1].name : null;
}

function describe(node: ComponentNode, ctx: DecompositionContext): string | null {
  const meaning = (char: string) => meaningOf(char, ctx);

  const { element, original, partial } = node;
  if (original && original !== element) {
    const m = meaning(original);
    const what = partial ? "part of" : "form of";
    return m ? `${what} ${original} (${m})` : `${what} ${original}`;
  }
  return element ? meaning(element) : null;
}

/**
 * Turns a KanjiVG component tree into display-ready components with names
 * and roles. Returns the kanji's direct components (the root is the kanji).
 */
export function decompose(
  kanji: Kanji,
  root: ComponentNode,
  ctx: DecompositionContext,
): DecomposedComponent[] {
  const build = (node: ComponentNode): DecomposedComponent => ({
    character: node.element ?? null,
    name: describe(node, ctx),
    radicalNumber:
      radicalNumberOf(node.element, ctx.radicals) ?? radicalNumberOf(node.original, ctx.radicals),
    position: node.position ?? null,
    roles: node.phon
      ? [
          {
            kind: "phonetic",
            source: "KanjiVG",
            ...(node.phon !== node.element && { note: `Sound component: ${node.phon}` }),
          },
        ]
      : [],
    strokes: node.strokes,
    children: node.children.map(build),
  });

  const components = root.children.map(build);
  const radicalNode = findKanjiRadical(kanji, root, components);
  if (radicalNode) {
    radicalNode.roles.unshift({ kind: "radical", source: "KANJIDIC2" });
    // In a phono-semantic compound, the non-phonetic radical carries the meaning.
    const hasPhonetic = components.some((c) => c.roles.some((r) => r.kind === "phonetic"));
    const isTopLevel = components.includes(radicalNode);
    if (hasPhonetic && isTopLevel && !radicalNode.roles.some((r) => r.kind === "phonetic")) {
      radicalNode.roles.push({
        kind: "semantic",
        source: "inferred",
        note: "Inferred: in a meaning + sound compound, the radical usually carries the meaning.",
      });
    }
  }
  return components;
}

/**
 * The component that is the kanji's classical radical (per KANJIDIC2),
 * searching shallowest first. Falls back to KanjiVG's own radical marker.
 */
function findKanjiRadical(
  kanji: Kanji,
  root: ComponentNode,
  components: DecomposedComponent[],
): DecomposedComponent | null {
  const pairs: [ComponentNode, DecomposedComponent][] = [];
  const queue: [ComponentNode, DecomposedComponent][] = root.children.map((n, i) => [n, components[i]]);
  while (queue.length) {
    const [node, out] = queue.shift()!;
    pairs.push([node, out]);
    node.children.forEach((child, i) => queue.push([child, out.children[i]]));
  }
  const byNumber = pairs.find(([, out]) => out.radicalNumber === kanji.radical);
  if (byNumber) return byNumber[1];
  const byMarker = pairs.find(([node]) => node.radical === "general" || node.radical === "tradit");
  return byMarker?.[1] ?? null;
}

// KanjiVG positions. The "-c" forms mark the piece contained by a tare, nyō,
// or kamae (病 = 疒 tare + 丙 tarec).
const POSITION_LABELS: Record<string, string> = {
  left: "left",
  right: "right",
  top: "top",
  bottom: "bottom",
  middle: "middle",
  kamae: "enclosure",
  kamaec: "inside",
  tare: "top-left hang",
  tarec: "inside",
  nyo: "bottom-left wrap",
  nyoc: "inside",
};

export function positionLabel(position: string | null): string | null {
  return position ? (POSITION_LABELS[position] ?? null) : null;
}
