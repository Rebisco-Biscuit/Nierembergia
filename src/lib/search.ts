import { isKana, toHiragana } from "wanakana";
import type { Dataset, JlptLevel, Kanji, Radical } from "./types";

export interface SearchFilters {
  jlpt?: JlptLevel[];
  grades?: number[];
  minStrokes?: number;
  maxStrokes?: number;
}

export type QueryKind = "browse" | "character" | "reading" | "meaning" | "radical";

export interface SearchResult {
  kind: QueryKind;
  kanji: Kanji[];
  /** Radicals the query names or contains, shown alongside the kanji. */
  radicals: Radical[];
}


const RADICAL_NUMBER_QUERY = /^(?:r|rad|radical)\s*[:#]?\s*(\d{1,3})$/i;
const IDEOGRAPH = /[\p{Script=Han}⺀-⿟]/u;

/** Katakana → hiragana, with KANJIDIC2's "." (okurigana) and "-" (affix) marks removed. */
export function normalizeReading(reading: string): string {
  return toHiragana(reading.replace(/[.\-]/g, ""), { passRomaji: true });
}

/** The part of a kun'yomi before its okurigana, e.g. "た.べる" → "た". */
function readingStem(reading: string): string {
  return normalizeReading(reading.split(".")[0]);
}

export function matchesFilters(k: Kanji, filters: SearchFilters): boolean {
  if (filters.jlpt?.length && (k.jlpt === null || !filters.jlpt.includes(k.jlpt))) {
    return false;
  }
  if (filters.grades?.length && (k.grade === null || !filters.grades.includes(k.grade))) {
    return false;
  }
  if (filters.minStrokes !== undefined && k.strokes < filters.minStrokes) return false;
  if (filters.maxStrokes !== undefined && k.strokes > filters.maxStrokes) return false;
  return true;
}

function radicalForChar(char: string, radicals: Radical[]): Radical | undefined {
  return radicals.find((r) => r.character === char || r.variants.includes(char));
}

/** Higher is better; 0 means no match. */
function scoreReading(k: Kanji, kana: string): number {
  let best = 0;
  for (const reading of [...k.onyomi, ...k.kunyomi]) {
    const full = normalizeReading(reading);
    const stem = readingStem(reading);
    if (full === kana) best = Math.max(best, 100);
    else if (stem === kana) best = Math.max(best, 80);
    else if (kana.length >= 2 && full.startsWith(kana)) best = Math.max(best, 30);
  }
  return best;
}

function scoreMeaning(k: Kanji, query: string): number {
  let best = 0;
  const wordStart = new RegExp(`\\b${escapeRegExp(query)}`, "i");
  const wholeWord = new RegExp(`\\b${escapeRegExp(query)}\\b`, "i");
  for (const [i, meaning] of k.meanings.entries()) {
    const m = meaning.toLowerCase();
    // An exact primary meaning (火 "fire") beats an exact secondary one (放 "…, fire").
    if (m === query) best = Math.max(best, i === 0 ? 110 : 100);
    else if (wholeWord.test(m)) best = Math.max(best, m.startsWith(query) ? 70 : 60);
    else if (query.length >= 3 && wordStart.test(m)) best = Math.max(best, 30);
  }
  return best;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sorts by score (descending); ties keep dataset order, which is by frequency. */
function ranked(scored: { k: Kanji; score: number; index: number }[]): Kanji[] {
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.k);
}

export function search(
  rawQuery: string,
  filters: SearchFilters,
  { kanji, radicals }: Dataset,
): SearchResult {
  const query = rawQuery.trim().toLowerCase();
  const apply = (list: Kanji[]) => list.filter((k) => matchesFilters(k, filters));

  if (!query) {
    return { kind: "browse", kanji: apply(kanji), radicals: [] };
  }

  const radicalNumber = RADICAL_NUMBER_QUERY.exec(query);
  if (radicalNumber) {
    const number = Number(radicalNumber[1]);
    const radical = radicals.find((r) => r.number === number);
    return {
      kind: "radical",
      kanji: radical ? apply(kanji.filter((k) => k.radical === number)) : [],
      radicals: radical ? [radical] : [],
    };
  }

  if (IDEOGRAPH.test(query)) {
    // Each character is looked up exactly; characters that are radicals also
    // pull in the kanji built on that radical, after the exact matches.
    const chars = [...new Set([...query].filter((c) => IDEOGRAPH.test(c)))];
    const byChar = new Map(kanji.map((k) => [k.character, k]));
    const exact = chars.flatMap((c) => byChar.get(c) ?? []);
    const matchedRadicals = chars.flatMap((c) => radicalForChar(c, radicals) ?? []);
    const radicalNumbers = new Set(matchedRadicals.map((r) => r.number));
    const exactSet = new Set(exact);
    const viaRadical = kanji.filter(
      (k) => radicalNumbers.has(k.radical) && !exactSet.has(k),
    );
    return {
      kind: "character",
      kanji: apply([...exact, ...viaRadical]),
      radicals: [...new Set(matchedRadicals)],
    };
  }

  const kanaOnly = query.replace(/[\s.\-ー]/g, "");
  if (kanaOnly && isKana(kanaOnly)) {
    const kana = normalizeReading(query.replace(/\s/g, ""));
    return {
      kind: "reading",
      kanji: apply(ranked(kanji.map((k, index) => ({ k, index, score: scoreReading(k, kana) })))),
      radicals: [],
    };
  }

  // Latin text: English meaning, plus romaji readings ("mizu", "sui").
  const romaji = toHiragana(query.replace(/\s/g, ""));
  const romajiIsKana = isKana(romaji);
  const scored = kanji.map((k, index) => ({
    k,
    index,
    score: Math.max(
      scoreMeaning(k, query),
      // Below whole-word meanings, so "man" finds 男 before 万 (まん).
      romajiIsKana ? scoreReading(k, romaji) * 0.5 : 0,
    ),
  }));
  return {
    kind: "meaning",
    kanji: apply(ranked(scored)),
    radicals: radicals.filter((r) => r.name === query || r.name.split(" ").includes(query)),
  };
}
