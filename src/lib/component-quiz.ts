// Quiz questions about how kanji are built: the missing part, which kanji
// contains a part, which kanji a set of parts builds, and telling a kanji
// apart from its look-alikes. Needs the optional `parts`, `components`, and
// `similar` fields on StudyKanji; returns null for kanji without them.

import { shuffle } from "./random";
import { OPTION_COUNT, type ComponentKind, type Option, type Question, type StudyKanji } from "./study";

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const sortedKey = (parts: string[]) => [...parts].sort().join("");

/** Candidates in preference order: look-alikes first (the hard ones), then same level, then anything. */
function candidates(target: StudyKanji, pool: StudyKanji[], byChar: Map<string, StudyKanji>, rand: () => number) {
  const alike = (target.similar ?? []).flatMap((c) => byChar.get(c) ?? []);
  const sameLevel = pool.filter((k) => k.jlpt !== null && k.jlpt === target.jlpt);
  return [...alike, ...shuffle(sameLevel, rand), ...shuffle(pool, rand)].filter(
    (k) => k.character !== target.character,
  );
}

/** Up to OPTION_COUNT - 1 distinct distractors, or null if there aren't enough. */
function pickDistractors(
  correct: string,
  sources: Iterable<Option>,
  accept: (o: Option) => boolean,
): Option[] | null {
  const used = new Set([correct]);
  const picked: Option[] = [];
  for (const o of sources) {
    if (picked.length === OPTION_COUNT - 1) break;
    if (used.has(o.label) || !accept(o)) continue;
    used.add(o.label);
    picked.push(o);
  }
  return picked.length === OPTION_COUNT - 1 ? picked : null;
}

function finish(
  kind: ComponentKind,
  target: StudyKanji,
  correct: Option,
  distractors: Option[],
  rand: () => number,
  extra: Partial<Question> = {},
): Question {
  const options = shuffle([correct, ...distractors], rand);
  return { kind, target, options, answer: options.indexOf(correct), ...extra };
}

/**
 * Builds one component question for `target`, or null if it can't be asked
 * this way (too few parts, no look-alikes, or not enough safe distractors).
 */
export function makeComponentQuestion(
  kind: ComponentKind,
  target: StudyKanji,
  pool: StudyKanji[],
  rand: () => number,
): Question | null {
  const parts = target.parts ?? [];
  const byChar = new Map(pool.map((k) => [k.character, k]));
  const asKanji = (label: string): Option => ({ label, kanji: byChar.get(label) });

  if (kind === "missing") {
    // "語 = 言 + ？": the target is shown, so only its own part is right.
    if (parts.length < 2) return null;
    const missingIndex = Math.floor(rand() * parts.length);
    const answer = parts[missingIndex];
    const partSources = candidates(target, pool, byChar, rand).flatMap((k) => k.parts ?? []);
    const distractors = pickDistractors(answer, partSources.map(asKanji), (o) => !parts.includes(o.label));
    if (!distractors) return null;
    return finish(kind, target, asKanji(answer), distractors, rand, {
      parts: parts.map((p, i) => (i === missingIndex ? null : p)),
    });
  }

  if (kind === "contains") {
    // "Which kanji contains 青?": distractors must not contain it at any depth.
    if (parts.length === 0) return null;
    const component = parts[Math.floor(rand() * parts.length)];
    const sources = candidates(target, pool, byChar, rand)
      .filter((k) => k.components && !k.components.includes(component))
      .map((k) => ({ label: k.character, kanji: k }));
    const distractors = pickDistractors(target.character, sources, () => true);
    if (!distractors) return null;
    return finish(kind, target, { label: target.character, kanji: target }, distractors, rand, { component });
  }

  if (kind === "build") {
    // "Which kanji is made of 言 + 吾?": skip candidates with the same parts (未 and 末).
    if (parts.length < 2) return null;
    const key = sortedKey(parts);
    const sources = candidates(target, pool, byChar, rand)
      .filter((k) => k.parts && k.parts.length > 0 && sortedKey(k.parts) !== key)
      .map((k) => ({ label: k.character, kanji: k }));
    const distractors = pickDistractors(target.character, sources, () => true);
    if (!distractors) return null;
    return finish(kind, target, { label: target.character, kanji: target }, distractors, rand, { parts });
  }

  // "lookalike": which of these look-alikes means the target's meaning?
  const meaning = target.meanings[0];
  const alike = (target.similar ?? []).flatMap((c) => byChar.get(c) ?? []);
  if (!meaning || alike.length < 2) return null;
  const sources = candidates(target, pool, byChar, rand).map((k) => ({ label: k.character, kanji: k }));
  const distractors = pickDistractors(
    target.character,
    sources,
    (o) => !o.kanji!.meanings.some((m) => sameText(m, meaning)),
  );
  if (!distractors) return null;
  return finish(kind, target, { label: target.character, kanji: target }, distractors, rand);
}
