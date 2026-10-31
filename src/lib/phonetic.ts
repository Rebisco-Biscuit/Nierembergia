/**
 * How well a sound component's readings match the kanji it sits in. Sound
 * components are a hint, not a rule: readings drift over centuries (主 シュ,
 * 住 ジュウ), so the match is graded rather than yes/no.
 */
export type SoundMatch = "same" | "close" | "drifted";

export interface SoundEvidence {
  /** The character whose readings were compared (the sound component). */
  component: string;
  /** Its on'yomi. */
  componentReadings: string[];
  /** The kanji's on'yomi. */
  kanjiReadings: string[];
  match: SoundMatch;
  /** Readings both share exactly (for "same") or nearly (for "close"). */
  shared: string[];
}

const VOICED = "ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴ";
const PLAIN = "カキクケコサシスセソタチツテトハヒフヘホハヒフヘホウ";

/** Drops voicing marks: ジュウ → シュウ, バイ → ハイ. */
export const devoice = (reading: string) =>
  [...reading].map((ch) => PLAIN[VOICED.indexOf(ch)] ?? ch).join("");

/** Readings that start with the same sound once voicing is ignored (チ, チョク). */
const close = (a: string, b: string) => {
  const [x, y] = [devoice(a), devoice(b)];
  return x === y || x[0] === y[0];
};

export function compareReadings(
  component: string,
  componentReadings: string[],
  kanjiReadings: string[],
): SoundEvidence | null {
  if (componentReadings.length === 0 || kanjiReadings.length === 0) return null;
  const evidence = (match: SoundMatch, shared: string[]) => ({
    component,
    componentReadings,
    kanjiReadings,
    match,
    shared,
  });
  const same = kanjiReadings.filter((r) => componentReadings.includes(r));
  if (same.length > 0) return evidence("same", same);
  const near = kanjiReadings.filter((r) => componentReadings.some((c) => close(r, c)));
  return near.length > 0 ? evidence("close", near) : evidence("drifted", []);
}

export const SOUND_MATCH_LABELS: Record<SoundMatch, string> = {
  same: "Same reading",
  close: "Similar reading",
  drifted: "Reading has drifted",
};
