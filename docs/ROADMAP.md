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
- [x] **Day 3 — Visual component decomposition** (2026-10-17)
      KanjiVG component trees for 3,036 kanji, shown on each detail page as a
      colour-coded overview plus a card per component (mini stroke diagram,
      name, radical number vs general component, position). Roles carry their
      source: radical (KANJIDIC2), sound (KanjiVG), and meaning (inferred by
      the app, marked with "?").
- [x] **Day 4 — Clickable components** (2026-10-19)
      Reverse index from 1,045 components to the kanji containing them.
      `/component/[character]` pages list those kanji (most frequent first),
      with radical info and links between forms like 氵 ↔ 水. Components on
      detail pages link there with a count, and detail pages show related
      kanji grouped by shared component (sound components first) plus the
      kanji that use this kanji as a component.
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
