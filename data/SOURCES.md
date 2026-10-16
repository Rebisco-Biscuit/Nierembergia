# Data sources

The app's dataset lives in `src/data/` and is generated, never edited by hand:

```sh
npm run data:fetch   # downloads raw files into data/raw/ (gitignored)
npm run data:build   # writes kanji, radicals, vocab, and strokes JSON into src/data/
```

| Source | Used for | Licence |
| --- | --- | --- |
| [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), Electronic Dictionary Research and Development Group | Characters, on/kun readings, English meanings, stroke counts, school grades, frequency ranks, classical radical numbers | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) |
| [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (`jlpt_new`, derived from Jonathan Waller's JLPT lists) | New-style JLPT levels (N5–N1); the official JLPT has not published kanji lists since 2010, so these levels are an approximation | MIT (repository); JLPT lists CC BY |
| [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) (English edition), Electronic Dictionary Research and Development Group | Example vocabulary: spelling, reading, and first-sense English glosses (`vocab.json`) | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) |
| [KanjiVG](https://kanjivg.tagaini.net/) by Ulrich Apel, release r20260714 | Stroke paths in stroke order (`strokes.json`) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| [Unicode Character Database](https://www.unicode.org/ucd/) `UnicodeData.txt` | The 214 Kangxi radicals (U+2F00–U+2FD5), their English names and unified-ideograph equivalents | [Unicode License v3](https://www.unicode.org/license.txt) |

Hand-maintained additions (in `scripts/build-data.mts`):

- **Radical variants** — positional/alternate forms such as 氵 (water), 扌 (hand),
  and 艹 (grass), so searching for a variant finds its radical.
- **Japanese radical forms** — radicals 63 and 174 use 戸 and 青, the forms used
  in Japan, with the Kangxi forms 戶 and 靑 kept as variants.

Selection: a kanji is included if it has a school grade (all jōyō and jinmeiyō
kanji), a frequency rank, or a JLPT level. Meanings of the form "X radical
(no. N)" are dropped because radical information is displayed separately.
Traditional jinmeiyō forms encoded as CJK compatibility ideographs (e.g. 神
U+FA19) are kept and linked to their standard form through `variantOf`.

Vocabulary: only JMdict words marked common (`ke_pri`) are used, excluding
spellings flagged irregular, outdated, rare, or search-only. Up to 8 per kanji
are chosen by newspaper frequency band (`nfXX`), shorter words first on ties
(see `src/lib/vocab.ts`). JMdict is updated daily and isn't pinned, so a rebuild
can change the examples slightly. Because the frequency data comes from
newspapers, it leans toward news vocabulary.

Stroke order: KanjiVG is pinned to a release. For 46 kanji its stroke count
differs from KANJIDIC2's, typically because KanjiVG draws a traditional form of
a component (e.g. 辻 with a two-dot shinnyō); the detail page notes this.
KanjiVG has no diagram for 89 kanji, mostly the compatibility-ideograph forms.
