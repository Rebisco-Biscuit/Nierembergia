import type { Library } from "./library";
import { shuffle } from "./random";
import type { JlptLevel, Kanji } from "./types";

/** The slice of a kanji that study sessions need, small enough to send to the browser. */
export type StudyKanji = Pick<Kanji, "character" | "meanings" | "onyomi" | "kunyomi" | "jlpt">;

export const toStudyKanji = (k: Kanji): StudyKanji => ({
  character: k.character,
  meanings: k.meanings.slice(0, 3),
  onyomi: k.onyomi.slice(0, 3),
  kunyomi: k.kunyomi.slice(0, 3),
  jlpt: k.jlpt,
});

export type DeckSource =
  | { kind: "bookmarks" }
  | { kind: "collection"; id: string }
  | { kind: "jlpt"; level: JlptLevel }
  /** Kanji missed the last time they came up (see progress.ts). */
  | { kind: "weak" };

/** The kanji a deck source refers to, skipping any not in `all`. */
export function deckFromSource(
  source: DeckSource,
  library: Library,
  all: StudyKanji[],
  weak: string[] = [],
): StudyKanji[] {
  if (source.kind === "jlpt") return all.filter((k) => k.jlpt === source.level);
  const byChar = new Map(all.map((k) => [k.character, k]));
  const chars =
    source.kind === "bookmarks"
      ? library.bookmarks
      : source.kind === "weak"
        ? weak
        : (library.collections.find((c) => c.id === source.id)?.kanji ?? []);
  return chars.flatMap((c) => byChar.get(c) ?? []);
}

/**
 * What a quiz question asks: the meaning of a kanji, the kanji for a meaning,
 * or a kanji's reading.
 */
export type QuestionKind = "meaning" | "kanji" | "reading";
export const QUESTION_KINDS: QuestionKind[] = ["meaning", "kanji", "reading"];

export interface Option {
  /** What the button shows. */
  label: string;
  /** The kanji this option belongs to, used to explain wrong answers. */
  kanji: StudyKanji;
}

export interface Question {
  kind: QuestionKind;
  target: StudyKanji;
  options: Option[];
  /** Index of the correct option. */
  answer: number;
}

/** A reading as learners write it: "た.べる" → "たべる", "-び" → "び". */
export const displayReading = (r: string) => r.replace(/[.-]/g, "");

export const readingsOf = (k: StudyKanji) => [...k.onyomi, ...k.kunyomi].map(displayReading);

/** The label a kanji contributes as an option for this kind of question. */
function labelFor(kind: QuestionKind, k: StudyKanji): string | null {
  if (kind === "kanji") return k.character;
  if (kind === "meaning") return k.meanings[0] ?? null;
  return readingsOf(k)[0] ?? null;
}

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Would this candidate also be a correct answer? Then it can't be a distractor. */
function overlapsTarget(kind: QuestionKind, candidate: StudyKanji, label: string, target: StudyKanji): boolean {
  // "Which kanji means X?": the candidate must not mean X too.
  if (kind === "kanji") return candidate.meanings.some((m) => sameText(m, target.meanings[0]));
  if (kind === "meaning") return target.meanings.some((m) => sameText(m, label));
  return readingsOf(target).includes(label);
}

export const OPTION_COUNT = 4;

/**
 * Builds one multiple-choice question. Distractors come from the same JLPT
 * level when possible, and never share an answer with the target. Returns
 * null if the target can't be asked this way or there are too few distractors.
 */
export function makeQuestion(
  kind: QuestionKind,
  target: StudyKanji,
  pool: StudyKanji[],
  rand: () => number,
): Question | null {
  const correct = labelFor(kind, target);
  // A kanji → meaning question needs the kanji to have a meaning, and so on.
  if (!correct || (kind === "kanji" && !target.meanings[0])) return null;

  const usedLabels = new Set([correct]);
  const distractors: Option[] = [];
  const sameLevel = pool.filter((k) => k.jlpt !== null && k.jlpt === target.jlpt);
  for (const candidate of [...shuffle(sameLevel, rand), ...shuffle(pool, rand)]) {
    if (distractors.length === OPTION_COUNT - 1) break;
    if (candidate.character === target.character) continue;
    const label = labelFor(kind, candidate);
    if (!label || usedLabels.has(label) || overlapsTarget(kind, candidate, label, target)) continue;
    usedLabels.add(label);
    distractors.push({ label, kanji: candidate });
  }
  if (distractors.length < OPTION_COUNT - 1) return null;

  const options = shuffle([{ label: correct, kanji: target }, ...distractors], rand);
  return { kind, target, options, answer: options.findIndex((o) => o.kanji === target) };
}

/**
 * A quiz over `deck`: up to `count` questions, cycling through `kinds`, each
 * kanji at most once. Kanji that can't be asked a given kind are skipped.
 */
export function makeQuiz(
  deck: StudyKanji[],
  pool: StudyKanji[],
  count: number,
  kinds: QuestionKind[],
  rand: () => number,
): Question[] {
  const questions: Question[] = [];
  for (const target of shuffle(deck, rand)) {
    if (questions.length >= count) break;
    for (let attempt = 0; attempt < kinds.length; attempt++) {
      const kind = kinds[(questions.length + attempt) % kinds.length];
      const q = makeQuestion(kind, target, pool, rand);
      if (q) {
        questions.push(q);
        break;
      }
    }
  }
  return questions;
}

export const QUESTION_PROMPTS: Record<QuestionKind, string> = {
  meaning: "What does this kanji mean?",
  kanji: "Which kanji means this?",
  reading: "How is this kanji read?",
};
