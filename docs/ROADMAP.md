# Roadmap

Nierembergia is built **one feature per day**. Each day ships one feature,
with tests, and is ticked off here. The full product spec is in
[SPEC.md](SPEC.md).

## MVP

- [x] **Day 1 — Searchable kanji database** (2026-10-15)
      KANJIDIC2-based dataset (3,125 kanji, 214 radicals); search by character,
      kana or romaji reading, English meaning, radical character/variant, or
      radical number (`r:85`); JLPT, grade, and stroke filters; pagination;
      loading, empty, and error states. Project foundation: Next.js, Tailwind,
      Vitest, ESLint, type checking, CI.
- [x] **Day 2 — Kanji detail pages** (2026-10-16)
      `/kanji/[character]`, prerendered for all 3,125 kanji: meanings,
      on/kun readings (okurigana marked), stroke count, JLPT, grade, frequency,
      radical, links between traditional and standard forms, up to 8 common
      example words from JMdict, and KanjiVG stroke order (animation plus
      stroke-by-stroke frames). Search results link to these pages.
- [ ] **Day 3 — Visual component decomposition**
      Component breakdown for each kanji, with data provenance recorded.
- [ ] **Day 4 — Clickable components**
      Components link to the kanji that contain them; related kanji on the
      detail page.
- [ ] **Day 5 — Bookmarks and custom collections**
- [ ] **Day 6 — Basic flashcards and quizzes**
- [ ] **Day 7 — Persistent study progress**

## After the MVP

Order is provisional; revisit after Day 7.

- [ ] Component explorer (search components, group and filter kanji by them)
- [ ] Kanji comparison (shared/different components, readings, meanings)
- [ ] Similar-looking kanji and explanations of their differences
- [ ] Spaced-repetition scheduling; easy / difficult / forgotten marks
- [ ] Expanded quiz types (missing component, reconstruct, similar kanji)
- [ ] Semantic and phonetic component roles, with uncertainty marked
- [ ] Example sentences
- [ ] Personal notes and mnemonics
- [ ] Progress dashboard and charts
- [ ] Daily targets and filtered study sessions
- [ ] Export and import of study progress
