import { toRomaji } from "wanakana";

/**
 * Romaji for a kana reading, for learners still building their kana.
 * KANJIDIC2 kun'yomi marks okurigana with "." and affixes with "-":
 * "た.べる" becomes "ta(beru)" so the kanji's own part stays visible, and
 * "-び" becomes "-bi". Already-romaji or other text passes through.
 */
export function romaji(reading: string): string {
  const [stem, okurigana] = reading.split(".");
  return okurigana === undefined ? toRomaji(stem) : `${toRomaji(stem)}(${toRomaji(okurigana)})`;
}
