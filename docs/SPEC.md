# Kanji Decomposition Explorer

## 1. Core Features

### A. Kanji Explorer
- Search kanji by character, meaning, reading, or radical.
- Display the kanji's meanings.
- Show onyomi (音読み) and kunyomi (訓読み).
- Display JLPT level, school grade, and stroke count when available.
- Show example vocabulary with kana readings and English meanings.
- Display stroke order diagrams or animations.
- Allow users to bookmark kanji for later study.

### B. Kanji Decomposition
- Break each kanji into its constituent components.
- Display each component visually.
- Show the name or description of each component when known.
- Explain the role of each component where reliable information is available.
- Identify the semantic component (meaning-related) and phonetic component (sound-related) when applicable.
- Allow users to click a component to explore other kanji containing it.
- Display related kanji that share components.
- Distinguish between radicals and general components.

### C. Component Explorer
- Search components by character, name, or radical number.
- Display the kanji associated with each component.
- Group related kanji by shared components.
- Filter results by JLPT level, stroke count, or frequency.
- Show how a component appears in different positions or forms within kanji.

### D. Kanji Comparison
- Select two or more kanji for comparison.
- Highlight shared and different components.
- Compare meanings, readings, stroke counts, and example vocabulary.
- Identify visually similar kanji that are easy to confuse.
- Explain the differences between similar characters.

### E. Study Mode
- Generate study sessions from bookmarked or selected kanji.
- Create flashcards for meanings, readings, components, and vocabulary.
- Allow users to reveal answers after attempting recall.
- Record correct and incorrect answers.
- Schedule reviews using a spaced-repetition algorithm.
- Track retention, accuracy, and difficult kanji.
- Allow users to mark a character as easy, difficult, or forgotten.

### F. Quiz Mode
- Identify a kanji from its meaning.
- Recall the reading of a kanji.
- Identify a missing component.
- Match a component to the kanji containing it.
- Distinguish between visually similar characters.
- Reconstruct a kanji from its components where practical.
- Provide explanations after each answer.

## 2. Kanji Detail Page

Every kanji should have a dedicated page containing:

- Character
- Meanings
- Onyomi
- Kunyomi
- Stroke count
- JLPT level, if available
- School grade, if available
- Radical and radical number
- Component breakdown
- Semantic and phonetic roles, where known
- Stroke order
- Example vocabulary
- Example sentences
- Related kanji
- Similar-looking kanji
- Personal notes
- Bookmark and study controls

## 3. Progress Dashboard

- Total kanji explored
- Total kanji studied
- Kanji mastered
- Kanji due for review
- Overall quiz accuracy
- Study streak
- Study time
- Most difficult kanji
- Weak readings and components
- Progress by JLPT level
- Weekly and monthly progress charts

## 4. Personalization

- Create custom kanji collections.
- Add personal mnemonics and memory associations.
- Write notes for confusing characters.
- Create custom flashcard decks.
- Set daily study targets.
- Filter study sessions by JLPT level, component, or difficulty.
- Export and import study progress.

## 5. Data and Reliability

- Use a structured kanji dataset as the source of truth.
- Store kanji, readings, meanings, components, vocabulary, and relationships separately where appropriate.
- Preserve the source and provenance of decomposition data.
- Distinguish historically accurate etymology from modern visual mnemonics.
- Mark uncertain or disputed component analyses.
- Support alternate component forms and positional variants.
- Include tests for search, decomposition relationships, and study scheduling.

## 6. Technical Requirements

- Responsive interface for desktop and mobile.
- Fast search with useful filters.
- Persistent bookmarks and study progress.
- Accessible typography and Japanese character rendering.
- Loading, empty, and error states.
- Unit tests for core logic.
- Automated linting, type checking, and CI.
- Deployment through Vercel.

## 7. Future Features

- Handwriting input and kanji recognition.
- OCR for identifying kanji from images.
- Browser extension for looking up kanji on websites.
- Import vocabulary from Anki decks.
- Personalized recommendations based on weak components.
- Offline study support.
- User accounts and cloud synchronization.

## 8. Initial MVP Scope

Build these first:

1. Searchable kanji database.
2. Kanji detail pages.
3. Visual component decomposition.
4. Clickable components that link to related kanji.
5. Bookmarks and custom collections.
6. Basic flashcards and quizzes.
7. Persistent study progress.

Everything else can wait until the core experience works reliably.
