// Example sentences from the Tanaka Corpus (Tatoeba, via EDRDG's examples.utf).
// Used by scripts/build-data.mts, so this module must not import project
// modules through the "@/" alias.
import { toHiragana, toRomaji } from "wanakana";

/** Text with its furigana, if it needs any: ["食", "た"], ["べました"]. */
export type Segment = [text: string, reading?: string];

export interface Sentence {
  /** Tatoeba's id for the Japanese sentence. */
  id: number;
  ja: Segment[];
  /** Word by word: "kare wa isogashii desu ka?" */
  romaji: string;
  en: string;
}

/** One word of a B (index) line: 会う[01]{会えない}, 彼(かれ)[01], と(#1008490)[04]~ */
export interface IndexWord {
  /** Dictionary form, as in JMdict. */
  headword: string;
  /** Reading given in the line, if any. */
  reading?: string;
  /** JMdict entry number, when the line pins one. */
  seq?: string;
  /** The form used in the sentence, when it differs from the headword. */
  surface?: string;
  /** Marked as a checked, good example of the word. */
  good: boolean;
}

const WORD = /^(.+?)(?:\((#?)([^)]*)\))?(?:\[\d+\])?(?:\{([^}]*)\})?(~)?$/;

export function parseIndexLine(line: string): IndexWord[] {
  return line
    .split(" ")
    .filter(Boolean)
    .flatMap((token) => {
      const m = WORD.exec(token);
      if (!m) return [];
      const [, headword, hash, paren, surface, good] = m;
      return [
        {
          headword,
          ...(paren && (hash ? { seq: paren } : { reading: paren })),
          ...(surface && { surface }),
          good: good === "~",
        },
      ];
    });
}

/** Characters that need furigana: kanji, plus 々 and ヶ. */
const NEEDS_READING = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
/** Sentences with digits or Latin letters are skipped: their readings aren't recorded. */
const UNREADABLE = /[0-9０-９A-Za-zＡ-Ｚａ-ｚ]/;

/** Tatoeba includes crude and violent sentences; a study app shouldn't show them. */
const UNSUITABLE =
  /\b(fuck\w*|shit\w*|bitch\w*|cunt|cock|dick|pussy|piss\w*|bastard|asshole|whore|slut|sex\w*|porn\w*|rape\w*|nigg\w*|fag\w*|suicide|kill (yourself|you))\b/i;

export const needsReading = (text: string) => NEEDS_READING.test(text);

/** Splits text into runs that need furigana and runs that don't: 食べ物 → 食, べ, 物. */
function runs(text: string): string[] {
  return text.match(/[㐀-䶿一-鿿豈-﫿々〆ヶ]+|[^㐀-䶿一-鿿豈-﫿々〆ヶ]+/g) ?? [];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Furigana for `text` read as `reading`, by matching its kana against the
 * reading: 食べ物 + たべもの → 食(た) べ 物(もの). Null if they don't line up.
 */
export function align(text: string, reading: string): Segment[] | null {
  const parts = runs(text);
  const pattern = parts.map((p) => (needsReading(p) ? "(.+?)" : escape(toHiragana(p)))).join("");
  const m = new RegExp(`^${pattern}$`).exec(toHiragana(reading));
  if (!m) return null;
  let group = 1;
  return parts.map((p) => (needsReading(p) ? [p, m[group++]] : [p]));
}

/** 来る's stem changes with what follows: 来ない こ, 来た き, 来る く. */
function readingOfKuru(next: string): string {
  if (/^[なよさいこ]/.test(next)) return "こ";
  if (/^[るれ]/.test(next)) return "く";
  return "き";
}

/**
 * Furigana for a word as it appears in the sentence. Spelling variants are
 * matched against the headword's reading (腹いっぱい, はらいっぱい); inflected
 * forms reuse the headword's kanji readings (食べました: 食 is た as in 食べる).
 */
export function wordSegments(surface: string, headword: string, reading: string): Segment[] | null {
  // Only a spelling with the headword's ending can be read as the headword (来 in 来さえ isn't くる).
  const ending = (text: string) => {
    const last = runs(text).at(-1) ?? "";
    return needsReading(last) ? "" : last;
  };
  const sameEnding = ending(headword) === "" || ending(surface) === ending(headword);
  const direct = sameEnding ? align(surface, reading) : null;
  if (direct) return direct;
  const base = align(headword, reading);
  if (!base) return null;
  const kanjiReadings = new Map(base.filter((s) => s[1]).map((s) => [s[0], s[1]!]));
  const parts = runs(surface);
  const out: Segment[] = [];
  for (const [i, p] of parts.entries()) {
    if (!needsReading(p)) {
      out.push([p]);
      continue;
    }
    const r = p === "来" && headword.endsWith("来る") ? readingOfKuru(parts[i + 1] ?? "") : kanjiReadings.get(p);
    if (!r) return null;
    out.push([p, r]);
  }
  return out;
}

/** Looks up a headword's reading in JMdict, by entry number if the line gives one. */
export type ReadingLookup = (headword: string, seq?: string) => string | undefined;

const PUNCTUATION: Record<string, string> = { "。": ".", "、": ",", "？": "?", "！": "!", "…": "..." };
/** Particles written は, へ, を are said wa, e, o. */
const PARTICLES: Record<string, string> = { は: "wa", へ: "e", を: "o" };

/** Romaji for text between indexed words: punctuation, or the odd unindexed kana. */
const gapRomaji = (text: string) =>
  [...text]
    .map((ch) => PUNCTUATION[ch] ?? (/[ぁ-ー]/.test(ch) ? toRomaji(ch) : ""))
    .join("")
    .trim();

/** Romaji for one word, with particles as said: は wa, には ni wa, こんにちは konnichiwa. */
function wordRomaji(surface: string, headword: string, reading: string): string {
  if (surface !== headword) return toRomaji(reading);
  if (PARTICLES[surface]) return PARTICLES[surface];
  if (/^[ぁ-ゖ]+は$/.test(surface) && surface !== "はは") return `${toRomaji(surface.slice(0, -1))}wa`;
  return toRomaji(reading);
}

const readingOf = (segments: Segment[]) => segments.map(([text, r]) => r ?? text).join("");

/**
 * Builds a sentence with furigana and romaji from its A line (Japanese and
 * English) and B line. Null when any word with kanji can't be read reliably,
 * so every sentence shown is fully readable.
 */
export function buildSentence(
  id: number,
  ja: string,
  en: string,
  words: IndexWord[],
  lookup: ReadingLookup,
): Sentence | null {
  if (UNREADABLE.test(ja) || UNSUITABLE.test(en)) return null;
  const segments: Segment[] = [];
  let romaji = "";
  const say = (word: string, attach = false) => {
    romaji += attach || !romaji ? word : ` ${word}`;
  };
  let cursor = 0;
  const gap = (until: number) => {
    const text = ja.slice(cursor, until);
    if (!text) return true;
    if (needsReading(text)) return false;
    segments.push([text]);
    const r = gapRomaji(text);
    if (r) say(r, !/^[a-z]/.test(r));
    return true;
  };
  for (const word of words) {
    const surface = word.surface ?? word.headword;
    const at = ja.indexOf(surface, cursor);
    if (at < 0 || !gap(at)) return null;
    let parts: Segment[] | null = [[surface]];
    if (needsReading(surface)) {
      const reading = word.reading ?? lookup(word.headword, word.seq);
      parts = reading ? wordSegments(surface, word.headword, reading) : null;
      if (!parts) return null;
    }
    segments.push(...parts);
    say(wordRomaji(surface, word.headword, readingOf(parts)));
    cursor = at + surface.length;
  }
  if (!gap(ja.length)) return null;

  return { id, ja: merge(segments), romaji: romaji.charAt(0).toUpperCase() + romaji.slice(1), en };
}

/** Joins neighbouring segments without furigana. */
function merge(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segments) {
    const last = out.at(-1);
    if (last && !last[1] && !s[1]) last[0] += s[0];
    else out.push(s[1] ? [s[0], s[1]] : [s[0]]);
  }
  return out;
}

export const sentenceText = (s: Pick<Sentence, "ja">) => s.ja.map(([t]) => t).join("");

/** A sentence considered for a kanji, with what selection needs to know. */
export interface SentenceCandidate {
  sentence: Sentence;
  /** Headwords of the words containing the kanji, and whether any is a checked example. */
  words: string[];
  good: boolean;
}

/** 1 (N5) to 5 (N1); kanji outside the JLPT lists count as hardest. */
export type Difficulty = (char: string) => number;

const IDEAL_LENGTH = 12;
const MIN_LENGTH = 5;
const MAX_LENGTH = 24;

/**
 * Picks up to `limit` sentences for a kanji: short, built from kanji no
 * harder than it, checked examples first, and using different words where
 * possible so each sentence shows the kanji in a new setting.
 */
export function pickSentences(
  character: string,
  candidates: SentenceCandidate[],
  difficulty: Difficulty,
  limit: number,
): Sentence[] {
  const level = difficulty(character);
  const scored = candidates
    .map((c) => {
      const text = sentenceText(c.sentence);
      const length = [...text].length;
      const others = new Set([...text].filter((ch) => ch !== character && needsReading(ch)));
      const harder = [...others].reduce((sum, ch) => sum + Math.max(0, difficulty(ch) - level), 0);
      return { c, length, score: harder + Math.abs(length - IDEAL_LENGTH) * 0.15 - (c.good ? 1.5 : 0) };
    })
    .filter((x) => x.length >= MIN_LENGTH && x.length <= MAX_LENGTH)
    .sort((a, b) => a.score - b.score || a.c.sentence.id - b.c.sentence.id);

  const picked: SentenceCandidate[] = [];
  const usedWords = new Set<string>();
  const usedTexts = new Set<string>();
  // First pass: one sentence per word; second: fill up with the best of the rest.
  for (const pass of [0, 1]) {
    for (const { c } of scored) {
      if (picked.length >= limit) break;
      const text = sentenceText(c.sentence);
      if (usedTexts.has(text) || picked.includes(c)) continue;
      if (pass === 0 && c.words.some((w) => usedWords.has(w))) continue;
      picked.push(c);
      usedTexts.add(text);
      c.words.forEach((w) => usedWords.add(w));
    }
  }
  return picked.map((c) => c.sentence);
}
