# Data sources

The app's dataset lives in `src/data/` and is generated, never edited by hand:

```sh
npm run data:fetch   # downloads raw files into data/raw/ (gitignored)
npm run data:build   # writes kanji, radicals, vocab, sentences, and strokes JSON into src/data/
```

| Source | Used for | Licence |
| --- | --- | --- |
| [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), Electronic Dictionary Research and Development Group | Characters, on/kun readings, English meanings, stroke counts, school grades, frequency ranks, classical radical numbers | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) |
| [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (`jlpt_new`, derived from Jonathan Waller's JLPT lists) | New-style JLPT levels (N5–N1); the official JLPT has not published kanji lists since 2010, so these levels are an approximation | MIT (repository); JLPT lists CC BY |
| [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project) (English edition), Electronic Dictionary Research and Development Group | Example vocabulary: spelling, reading, and first-sense English glosses (`vocab.json`) | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) |
| [KanjiVG](https://kanjivg.tagaini.net/) by Ulrich Apel, release r20260714 | Stroke paths in stroke order (`strokes.json`); component trees with positions, radical and phonetic markers (`components.json`) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| [Tanaka Corpus](https://www.edrdg.org/wiki/index.php/Tanaka_Corpus) as maintained by [Tatoeba](https://tatoeba.org), distributed by EDRDG as `examples.utf` | Example sentences: Japanese, English translation, and the word index used to generate furigana and romaji (`sentences.json`) | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) |
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

Example sentences (`src/lib/sentences.ts`): each corpus sentence comes with a
word index (dictionary form, sometimes a reading, and the inflected form used).
Furigana are placed by matching each word's kana against its reading, taken
from the index or else JMdict (the entry it names, or the spelling's first
reading); inflected forms reuse the dictionary form's kanji readings, with
来る's changing stem handled. Romaji is generated word by word, with the
particles は, へ, を written wa, e, o. A sentence is kept only if every kanji
can be read this way and it has no digits or Latin letters (about 133,000 of
148,000); crude or violent sentences are filtered by their English. Up to 3 per
kanji are picked: 5–24 characters, few kanji harder than the target (by JLPT
level), checked examples (`~` in the index) first, and different words where
possible. Each links to its Tatoeba page. Readings are generated, so an
occasional one may be wrong, and the corpus is unpinned like JMdict.

Stroke order: KanjiVG is pinned to a release. For 46 kanji its stroke count
differs from KANJIDIC2's, typically because KanjiVG draws a traditional form of
a component (e.g. 辻 with a two-dot shinnyō); the detail page notes this.
KanjiVG has no diagram for 89 kanji, mostly the compatibility-ideograph forms.

Components (`src/lib/kanjivg.ts`, `src/lib/decomposition.ts`): each tree comes
from KanjiVG's nested `<g>` groups. Components that KanjiVG splits into
numbered parts around other strokes (`kvg:part`, e.g. 二 inside 五) are merged
into one. Each role shown in the app records its provenance:

- **Radical**: the component matching the kanji's KANJIDIC2 classical radical,
  falling back to KanjiVG's own radical marker if none matches.
- **Sound** (phonetic): KanjiVG's `kvg:phon` annotation.
- **Meaning** (semantic): *inferred by this app*, not stated by a source. It's
  assigned to the radical when the kanji also has a phonetic component, the
  usual reading of a phono-semantic (形声) compound. It describes the
  character's structure, not a verified etymology.
