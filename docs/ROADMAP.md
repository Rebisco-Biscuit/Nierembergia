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
- [x] **Day 5 — Bookmarks and custom collections** (2026-10-21)
      Bookmark toggle and a collections panel on every kanji page; `/library`
      to view, rename, delete, and prune collections and bookmarks; header
      link with the bookmark count. Saved in localStorage (versioned and
      validated on load, synced across tabs, in-memory fallback when storage
      is blocked). No accounts yet, so the library stays in one browser.
- [x] **Day 6 — Basic flashcards and quizzes** (2026-10-22)
      `/study`: pick a deck (bookmarks, a collection, or a JLPT level), a
      mode, and a length. Flashcards are self-graded (reveal with Space,
      grade with 1/2). Quizzes are multiple choice (kanji → meaning,
      meaning → kanji, kanji → reading) with same-level distractors that can
      never also be correct, and an explanation after every answer. Both end
      with a summary and a "review missed" round. Results aren't saved yet.
- [x] **Day 7 — Persistent study progress** (2026-10-23)
      Every flashcard and quiz answer is saved per kanji (times seen,
      correct, current streak, last seen), plus a log of finished sessions.
      `/study` shows kanji studied, accuracy, mastered (3 right in a row),
      day streak, recent sessions, and a "weak kanji" deck of those missed
      last time; progress can be reset. Detail pages show your stats for that
      kanji. Saved in localStorage like the library.

The MVP is complete. Next up is the first item below.

## After the MVP

Order is provisional; revisit after Day 7.

- [x] **Day 8 — Component explorer** (2026-10-25)
      `/components` lists all 1,045 components by use, searchable by
      character (radical variants match), English name, or radical number.
      Component pages filter their kanji by JLPT level, stroke count,
      frequency, the component's position (left, top, enclosure…), and the
      components it's often combined with.
- [x] **Day 9 — Kanji comparison and look-alikes** (2026-10-26)
      Look-alikes computed from shared KanjiVG components (top-level parts
      weighted double) and stroke count, shown on every detail page and
      labelled as computed. `/compare?k=…` puts 2–4 kanji side by side:
      shared parts, the parts that tell each apart (highlighted in its
      glyph), shared readings, meanings, readings, and example words.
- [x] **Day 10 — Spaced repetition** (2026-10-27)
      A simplified SM-2 schedule per kanji. Flashcards are graded Forgot /
      Hard / Good / Easy (keys 1–4), each button previewing when the card
      returns; quiz answers count as Good or Forgot. `/study` has a Due for
      review deck and banner, and says when the next review is. Detail pages
      show the next review and offer Easy / Difficult / Forgotten marks.
      Progress saved before scheduling still loads.
- [ ] Expanded quiz types (missing component, reconstruct, similar kanji)
- [ ] Semantic and phonetic component roles, with uncertainty marked
- [ ] Example sentences
- [x] **Day 11 — Personal notes and mnemonics** (2026-10-28)
      A mnemonic and a notes field on every kanji page, saved as you type.
      They show on the back of flashcards, in quiz explanations, and in each
      compare column; `/library` lists every kanji you've written about.
      Saved in localStorage like the rest of your data.
- [ ] Progress dashboard and charts
- [ ] Daily targets and filtered study sessions
- [ ] Export and import of study progress
