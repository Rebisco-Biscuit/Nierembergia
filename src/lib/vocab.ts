// Picks example vocabulary for a kanji from JMdict entries. Used by
// scripts/build-data.mts, so this module must not import anything.

export interface VocabWord {
  word: string;
  reading: string;
  meanings: string[];
}

/** A JMdict spelling with the priority tags (ke_pri) attached to it. */
export interface VocabCandidate extends VocabWord {
  priority: string[];
}

/**
 * Lower is more common. JMdict's nfXX tags rank words by newspaper frequency
 * in bands of 500 (nf01 = top 500); the other tags mark coarser "common word"
 * lists. Words with no priority tags aren't considered common and return null.
 */
export function priorityScore(tags: string[]): number | null {
  let best: number | null = null;
  for (const tag of tags) {
    const nf = /^nf(\d\d)$/.exec(tag);
    const score = nf
      ? Number(nf[1])
      : /^(news|ichi|spec|gai)1$/.test(tag)
        ? 50
        : /^(news|ichi|spec|gai)2$/.test(tag)
          ? 60
          : null;
    if (score !== null && (best === null || score < best)) best = score;
  }
  return best;
}

/**
 * The most common words written with `character`, most common first; ties
 * prefer shorter words, which are easier to learn from.
 */
export function pickExamples(
  candidates: VocabCandidate[],
  character: string,
  limit: number,
): VocabWord[] {
  const seen = new Set<string>();
  return candidates
    .filter((c) => c.word.includes(character))
    .map((c) => ({ c, score: priorityScore(c.priority) }))
    .filter((x): x is { c: VocabCandidate; score: number } => x.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        [...a.c.word].length - [...b.c.word].length ||
        a.c.word.localeCompare(b.c.word),
    )
    .filter(({ c }) => !seen.has(c.word) && seen.add(c.word))
    .slice(0, limit)
    .map(({ c }) => ({ word: c.word, reading: c.reading, meanings: c.meanings }));
}
