"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { seededRandom, shuffle } from "@/lib/random";
import {
  COMPONENT_KINDS,
  DIFFICULTIES,
  NO_FILTERS,
  QUESTION_KINDS,
  deckFromSource,
  filterDeck,
  hasFilters,
  makeQuiz,
  type DeckFilters,
  type DeckSource,
  type Difficulty,
  type Question,
  type QuestionKind,
  type StudyKanji,
} from "@/lib/study";
import type { JlptLevel } from "@/lib/types";
import { emptyProgress, recordAnswer, recordSession, summarize } from "@/lib/progress";
import type { Grade } from "@/lib/srs";
import { TargetsCard } from "../TargetsCard";
import { useHydrated, useLibrary, useProgress } from "../useLibrary";
import { Flashcards } from "./Flashcards";
import { ProgressPanel } from "./ProgressPanel";
import { Quiz } from "./Quiz";
import type { SessionResult } from "./SessionSummary";

type Mode = "flashcards" | "quiz";
const LENGTHS = [10, 20, Infinity] as const;
const JLPT_LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];

type Session =
  | { mode: "flashcards"; cards: StudyKanji[]; key: number; startedAt: number }
  | { mode: "quiz"; questions: Question[]; key: number; startedAt: number };

// Only ever called from event handlers, never during render.
const freshSeed = () => Math.floor(Math.random() * 2 ** 32);
const now = () => Date.now();
let sessionCount = 0;
const nextSessionKey = () => ++sessionCount;

type QuestionSet = "basic" | "parts" | "mixed";
const QUESTION_SETS: Record<QuestionSet, { label: string; kinds: QuestionKind[] }> = {
  basic: { label: "Meanings & readings", kinds: QUESTION_KINDS },
  parts: { label: "Parts & look-alikes", kinds: COMPONENT_KINDS },
  mixed: { label: "Mixed", kinds: [...QUESTION_KINDS, ...COMPONENT_KINDS] },
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  new: "New",
  learning: "Learning",
  weak: "Weak",
  mastered: "Mastered",
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

const chip = (on: boolean) =>
  `cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent-soft" : "border-border"}`;

const sourceKey = (s: DeckSource) =>
  s.kind === "jlpt" ? `jlpt:${s.level}` : s.kind === "collection" ? `c:${s.id}` : s.kind;

export function StudyApp({ all }: { all: StudyKanji[] }) {
  const [library] = useLibrary();
  const [progress, updateProgress] = useProgress();
  const hydrated = useHydrated();
  // `/study?component=氵` (linked from component pages) starts filtered to that component.
  const urlComponent = useSearchParams().get("component")?.trim() || null;
  const [componentDraft, setComponentDraft] = useState(urlComponent ?? "");
  const [source, setSource] = useState<DeckSource>(urlComponent ? { kind: "all" } : { kind: "jlpt", level: 5 });
  const [filters, setFilters] = useState<Omit<DeckFilters, "component">>(NO_FILTERS);
  const [mode, setMode] = useState<Mode>("flashcards");
  const [length, setLength] = useState<number>(10);
  const [questionSet, setQuestionSet] = useState<QuestionSet>("basic");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div
        className="mt-8 h-64 animate-pulse rounded-2xl border border-border bg-surface"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  const { weak, due, nextDue } = summarize(progress, now());
  const lists = { weak, due };
  const byChar = new Map(all.map((k) => [k.character, k]));
  const component = componentDraft.trim();
  const knownComponent = component !== "" && all.some((k) => k.components?.includes(component));
  const activeFilters: DeckFilters = { ...filters, component: knownComponent ? component : null };

  const sources: { source: DeckSource; label: string; count: number }[] = [
    {
      source: { kind: "due" },
      label: "Due for review",
      count: deckFromSource({ kind: "due" }, library, all, lists).length,
    },
    {
      source: { kind: "weak" },
      label: "Weak kanji",
      count: deckFromSource({ kind: "weak" }, library, all, lists).length,
    },
    { source: { kind: "bookmarks" }, label: "Bookmarks", count: library.bookmarks.length },
    ...library.collections.map((c) => ({
      source: { kind: "collection", id: c.id } as DeckSource,
      label: c.name,
      count: deckFromSource({ kind: "collection", id: c.id }, library, all).length,
    })),
    ...JLPT_LEVELS.map((level) => ({
      source: { kind: "jlpt", level } as DeckSource,
      label: `JLPT N${level}`,
      count: deckFromSource({ kind: "jlpt", level }, library, all).length,
    })),
    { source: { kind: "all" }, label: "All kanji", count: all.length },
  ];
  // A collection deleted elsewhere falls back to the default deck, N5.
  const find = (s: DeckSource) => sources.find((x) => sourceKey(x.source) === sourceKey(s));
  const selected = find(source) ?? find({ kind: "jlpt", level: 5 })!;

  /** Starts a session over `deck` (already chosen), shuffled with a fresh seed. */
  const start = (deck: StudyKanji[], chosenMode = mode) => {
    const rand = seededRandom(freshSeed());
    const cards = shuffle(deck, rand).slice(0, length);
    if (chosenMode === "flashcards") {
      setSession({ mode: "flashcards", cards, key: nextSessionKey(), startedAt: now() });
      setError(null);
      return;
    }
    const questions = makeQuiz(deck, all, Math.min(length, deck.length), QUESTION_SETS[questionSet].kinds, rand);
    if (questions.length === 0) {
      setError("Couldn't build quiz questions for this deck. Try flashcards, or a bigger deck.");
      return;
    }
    setSession({ mode: "quiz", questions, key: nextSessionKey(), startedAt: now() });
    setError(null);
  };

  const deck = () => filterDeck(deckFromSource(selected.source, library, all, lists), activeFilters, progress.kanji);
  const deckSize = deck().length;
  const exit = () => setSession(null);

  if (session) {
    const studyMode = session.mode;
    const common = {
      onAnswer: (k: StudyKanji, correct: boolean, grade?: Grade, kind?: QuestionKind) =>
        updateProgress((p) => recordAnswer(p, k.character, correct, now(), grade, kind)),
      onFinish: (results: SessionResult[]) =>
        updateProgress((p) =>
          recordSession(p, {
            at: now(),
            mode: studyMode,
            total: results.length,
            correct: results.filter((r) => r.correct).length,
            ms: now() - session.startedAt,
          }),
        ),
      onRestart: () => start(deck(), session.mode),
      onRetry: (missed: StudyKanji[]) => start(missed, session.mode),
      onExit: exit,
    };
    return (
      <div className="mt-8">
        <button type="button" onClick={exit} className="mb-4 text-sm text-muted hover:text-foreground">
          ← {selected.label}
        </button>
        {session.mode === "flashcards" ? (
          <Flashcards key={session.key} cards={session.cards} scheduleOf={(c) => progress.kanji[c]?.srs} {...common} />
        ) : (
          <Quiz key={session.key} questions={session.questions} {...common} />
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <TargetsCard progress={progress} onChange={(targets) => updateProgress((p) => ({ ...p, targets }))} />
      <ProgressPanel
        progress={progress}
        byChar={byChar}
        onStudyWeak={() => {
          setSource({ kind: "weak" });
          start(deckFromSource({ kind: "weak" }, library, all, lists));
        }}
        onReset={() => updateProgress((p) => ({ ...emptyProgress(), targets: p.targets }))}
        dueCount={due.length}
        nextDue={nextDue}
        onReviewDue={() => {
          setSource({ kind: "due" });
          // Reviews go through flashcards so each one can be graded.
          setMode("flashcards");
          start(deckFromSource({ kind: "due" }, library, all, lists), "flashcards");
        }}
      />
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          start(deck());
        }}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Deck</legend>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((s) => {
              const key = sourceKey(s.source);
              const checked = key === sourceKey(selected.source);
              const empty = s.count === 0;
              return (
                <li key={key}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      checked ? "border-accent bg-accent-soft" : "border-border bg-surface"
                    } ${empty ? "cursor-not-allowed opacity-50" : "hover:border-accent"}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deck"
                        checked={checked}
                        disabled={empty}
                        onChange={() => setSource(s.source)}
                        className="accent-[var(--accent)]"
                      />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-sm text-muted">{s.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {library.bookmarks.length === 0 && library.collections.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              Bookmark kanji or build collections from any{" "}
              <Link href="/" className="text-accent hover:underline">
                kanji page
              </Link>{" "}
              to study your own decks.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Filter</legend>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="mb-2 text-xs text-muted">JLPT level</p>
              <div className="flex flex-wrap gap-2">
                {JLPT_LEVELS.map((level) => (
                  <label key={level} className={chip(filters.jlpt.includes(level))}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={filters.jlpt.includes(level)}
                      onChange={() => setFilters({ ...filters, jlpt: toggle(filters.jlpt, level) })}
                    />
                    N{level}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <label key={d} className={chip(filters.difficulty.includes(d))}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={filters.difficulty.includes(d)}
                      onChange={() => setFilters({ ...filters, difficulty: toggle(filters.difficulty, d) })}
                    />
                    {DIFFICULTY_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-muted">Contains component</span>
              <input
                lang="ja"
                value={componentDraft}
                onChange={(e) => setComponentDraft(e.target.value)}
                placeholder="e.g. 氵"
                aria-describedby="component-hint"
                className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 font-serif text-lg"
              />
            </label>
          </div>
          <p id="component-hint" className="mt-3 text-sm text-muted" aria-live="polite">
            {component !== "" && !knownComponent ? (
              <span className="text-danger">
                No kanji contain <span lang="ja">{component}</span> as a component.
              </span>
            ) : hasFilters(activeFilters) ? (
              <>
                {deckSize.toLocaleString("en")} of {selected.count.toLocaleString("en")} kanji in {selected.label} match.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setComponentDraft("");
                  }}
                  className="text-accent hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              "Narrow any deck by level, how well you know each kanji, or a component it contains."
            )}
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-8">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Mode</legend>
            <div className="flex gap-2">
              {(["flashcards", "quiz"] as const).map((m) => (
                <label
                  key={m}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${mode === m ? "border-accent bg-accent-soft" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="mode"
                    className="sr-only"
                    checked={mode === m}
                    onChange={() => setMode(m)}
                  />
                  {m === "flashcards" ? "Flashcards" : "Quiz"}
                </label>
              ))}
            </div>
          </fieldset>
          {mode === "quiz" && (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Questions</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(QUESTION_SETS) as QuestionSet[]).map((set) => (
                  <label
                    key={set}
                    className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${questionSet === set ? "border-accent bg-accent-soft" : "border-border"}`}
                  >
                    <input
                      type="radio"
                      name="question-set"
                      className="sr-only"
                      checked={questionSet === set}
                      onChange={() => setQuestionSet(set)}
                    />
                    {QUESTION_SETS[set].label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Length</legend>
            <div className="flex gap-2">
              {LENGTHS.map((n) => (
                <label
                  key={n}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${length === n ? "border-accent bg-accent-soft" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="length"
                    className="sr-only"
                    checked={length === n}
                    onChange={() => setLength(n)}
                  />
                  {n === Infinity ? "All" : n}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={deckSize === 0}
          className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground disabled:opacity-40"
        >
          Start {mode === "flashcards" ? "flashcards" : "quiz"}: {selected.label}
          {hasFilters(activeFilters) && " (filtered)"} ({Math.min(length, deckSize)})
        </button>
      </form>
    </div>
  );
}
