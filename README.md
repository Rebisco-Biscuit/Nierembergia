# <img width="26" height="26" alt="image" src="https://github.com/user-attachments/assets/afc5812e-6aa8-42ed-b798-d77f6348b832" /> Nierembergia

A kanji decomposition explorer: search kanji, see how they're built from
components, and study them. Built one feature a day. See the
[roadmap](docs/ROADMAP.md) for what's shipped and what's next.

## Development

```sh
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run lint
npm run typecheck
```

## Search

The search box accepts:

| Query | Finds |
| --- | --- |
| `水`, `日本` | those kanji; a radical character also lists the kanji under it |
| `氵`, `扌`, `艹` | the kanji under that radical (variant forms work) |
| `みず`, `スイ`, `たべる` | kanji with that reading (okurigana included) |
| `mizu`, `sui` | the same, typed in romaji |
| `water` | kanji with that English meaning |
| `r:85`, `radical 85` | kanji under radical 85 |

Every kana reading in the app also shows romaji (たべる → taberu, た.べる → ta(beru)).
Turn it off with the **Romaji** switch in the header once you're comfortable with kana;
the choice is remembered in your browser.

Filter by JLPT level, school grade, and stroke count. Searches are kept in the
URL, so they can be shared and bookmarked.

## Pages

- `/kanji/水`: meanings, readings (with romaji), component breakdown (which part
  hints at the meaning and which at the sound), stroke order, example words, and
  related kanji.
- `/components`: search all components by character, name, or radical number.
- `/component/氵`: every kanji containing a component, with filters by level,
  strokes, frequency, position, and partner component, plus the kanji that use
  it for their sound.
- `/compare?k=待持特`: kanji side by side, with shared and distinguishing parts.
- `/study`: flashcards and quizzes (meanings, readings, parts, and look-alikes)
  from your bookmarks, a collection, a JLPT
  level, or the kanji you missed last time, plus your study progress.
- `/library`: your bookmarks, collections, and notes.

Bookmarks, collections, notes, and study progress are saved in your browser
(localStorage). Use "Back up & restore" on `/library` to download them as a file
or move them to another browser.

## Data

Kanji data comes from KANJIDIC2 (CC BY-SA 4.0) and other sources listed in
[data/SOURCES.md](data/SOURCES.md).
