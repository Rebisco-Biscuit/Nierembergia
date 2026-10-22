"use client";

import Link from "next/link";
import { useState } from "react";
import { seededRandom, shuffle } from "@/lib/random";
import {
  QUESTION_KINDS,
  deckFromSource,
  makeQuiz,
  type DeckSource,
  type Question,
  type StudyKanji,
} from "@/lib/study";
import type { JlptLevel } from "@/lib/types";
import { useHydrated, useLibrary } from "../useLibrary";
import { Flashcards } from "./Flashcards";
import { Quiz } from "./Quiz";

type Mode = "flashcards" | "quiz";
const LENGTHS = [10, 20, Infinity] as const;
const JLPT_LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];

type Session =
  | { mode: "flashcards"; cards: StudyKanji[]; key: number }
  | { mode: "quiz"; questions: Question[]; key: number };

// Only ever called from event handlers, when a session starts.
const freshSeed = () => Math.floor(Math.random() * 2 ** 32);
let sessionCount = 0;
const nextSessionKey = () => ++sessionCount;

const sourceKey = (s: DeckSource) =>
  s.kind === "jlpt" ? `jlpt:${s.level}` : s.kind === "collection" ? `c:${s.id}` : "bookmarks";

export function StudyApp({ all }: { all: StudyKanji[] }) {
  const [library] = useLibrary();
  const hydrated = useHydrated();
  const [source, setSource] = useState<DeckSource>({ kind: "jlpt", level: 5 });
  const [mode, setMode] = useState<Mode>("flashcards");
  const [length, setLength] = useState<number>(10);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return <div className="mt-8 h-64 animate-pulse rounded-2xl border border-border bg-surface" aria-busy="true" aria-label="Loading" />;
  }

  const sources: { source: DeckSource; label: string; count: number }[] = [
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
  ];
  // A collection deleted elsewhere falls back to the default deck, N5.
  const find = (s: DeckSource) => sources.find((x) => sourceKey(x.source) === sourceKey(s));
  const selected = find(source) ?? find({ kind: "jlpt", level: 5 })!;

  /** Starts a session over `deck` (already chosen), shuffled with a fresh seed. */
  const start = (deck: StudyKanji[], chosenMode = mode) => {
    const rand = seededRandom(freshSeed());
    const cards = shuffle(deck, rand).slice(0, length);
    if (chosenMode === "flashcards") {
      setSession({ mode: "flashcards", cards, key: nextSessionKey() });
      setError(null);
      return;
    }
    const questions = makeQuiz(deck, all, Math.min(length, deck.length), QUESTION_KINDS, rand);
    if (questions.length === 0) {
      setError("Couldn't build quiz questions for this deck. Try flashcards, or a bigger deck.");
      return;
    }
    setSession({ mode: "quiz", questions, key: nextSessionKey() });
    setError(null);
  };

  const deck = () => deckFromSource(selected.source, library, all);
  const exit = () => setSession(null);

  if (session) {
    const common = {
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
          <Flashcards key={session.key} cards={session.cards} {...common} />
        ) : (
          <Quiz key={session.key} questions={session.questions} {...common} />
        )}
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-8"
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

      <div className="flex flex-wrap gap-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Mode</legend>
          <div className="flex gap-2">
            {(["flashcards", "quiz"] as const).map((m) => (
              <label key={m} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${mode === m ? "border-accent bg-accent-soft" : "border-border"}`}>
                <input type="radio" name="mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
                {m === "flashcards" ? "Flashcards" : "Quiz"}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Length</legend>
          <div className="flex gap-2">
            {LENGTHS.map((n) => (
              <label key={n} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${length === n ? "border-accent bg-accent-soft" : "border-border"}`}>
                <input type="radio" name="length" className="sr-only" checked={length === n} onChange={() => setLength(n)} />
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
        disabled={selected.count === 0}
        className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground disabled:opacity-40"
      >
        Start {mode === "flashcards" ? "flashcards" : "quiz"}: {selected.label} (
        {Math.min(length, selected.count)})
      </button>
    </form>
  );
}
