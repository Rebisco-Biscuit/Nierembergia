import type { Kanji } from "./types";

export interface KunReading {
  /** The part written with the kanji. */
  stem: string;
  /** Kana that follows the kanji in writing, e.g. べる in 食べる. */
  okurigana: string;
  /** "-" before the reading: used as a suffix (…び in 日 -び). */
  isSuffix: boolean;
  /** "-" after the reading: used as a prefix (ひと- in 一). */
  isPrefix: boolean;
}

/** Splits KANJIDIC2 kun'yomi notation, e.g. "た.べる" or "-び". */
export function parseKunReading(reading: string): KunReading {
  const isSuffix = reading.startsWith("-");
  const isPrefix = reading.endsWith("-");
  const [stem, okurigana = ""] = reading.replace(/^-|-$/g, "").split(".");
  return { stem, okurigana, isSuffix, isPrefix };
}

export function gradeLabel(grade: Kanji["grade"]): string | null {
  if (grade === null) return null;
  if (grade <= 6) return `Grade ${grade}`;
  if (grade === 8) return "Secondary school (jōyō)";
  return "Jinmeiyō (names)";
}

/** The path to a kanji's detail page. */
export function kanjiHref(character: string): string {
  return `/kanji/${encodeURIComponent(character)}`;
}

/** The path to the page listing kanji that contain a component. */
export function componentHref(character: string): string {
  return `/component/${encodeURIComponent(character)}`;
}

/** Decodes a route param, tolerating values that are already decoded. */
export function decodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

/** A reading as learners write it: "た.べる" → "たべる", "-び" → "び". */
export const displayReading = (r: string) => r.replace(/[.-]/g, "");

/** The reading to show on a small kanji tile: its first on'yomi, else its first kun'yomi. */
export function previewReading(k: { onyomi?: string[]; kunyomi?: string[] }): string | null {
  const reading = k.onyomi?.[0] ?? k.kunyomi?.[0];
  return reading ? displayReading(reading) : null;
}
