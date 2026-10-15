export type JlptLevel = 1 | 2 | 3 | 4 | 5;

export interface Kanji {
  character: string;
  meanings: string[];
  /** On'yomi in katakana, as in KANJIDIC2. */
  onyomi: string[];
  /** Kun'yomi in hiragana. "." marks okurigana, "-" marks a prefix/suffix form. */
  kunyomi: string[];
  strokes: number;
  /** Japanese school grade: 1–6 kyōiku, 8 remaining jōyō, 9–10 jinmeiyō. */
  grade: number | null;
  /** New-style JLPT level (N5 = 5 … N1 = 1). */
  jlpt: JlptLevel | null;
  /** Newspaper frequency rank (1 = most frequent), top 2,500 only. */
  frequency: number | null;
  /** Classical (Kangxi) radical number, 1–214. */
  radical: number;
  /**
   * For traditional jinmeiyō forms encoded as CJK compatibility ideographs
   * (e.g. 神 U+FA19), the standard character they correspond to.
   */
  variantOf: string | null;
}

export interface Radical {
  number: number;
  /** The CJK Unified Ideograph form, e.g. 水. */
  character: string;
  /** Common positional variants, e.g. 氵 for water. */
  variants: string[];
  /** English name derived from the Unicode Kangxi Radicals block. */
  name: string;
  strokes: number;
}

export interface Dataset {
  kanji: Kanji[];
  radicals: Radical[];
}
