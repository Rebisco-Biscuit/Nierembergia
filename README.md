<<<<<<< HEAD
# Nierembergia

=======
# <img width="26" height="26" alt="image" src="https://github.com/user-attachments/assets/afc5812e-6aa8-42ed-b798-d77f6348b832" /> Nierembergia
>>>>>>> main
re:peat

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

Filter by JLPT level, school grade, and stroke count. Searches are kept in the
URL, so they can be shared and bookmarked.

## Data

Kanji data comes from KANJIDIC2 (CC BY-SA 4.0) and other sources listed in
[data/SOURCES.md](data/SOURCES.md).
