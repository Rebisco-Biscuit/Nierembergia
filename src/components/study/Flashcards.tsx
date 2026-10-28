"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { kanjiHref } from "@/lib/format";
import { GRADES, dueLabel, schedule, type Grade, type SrsState } from "@/lib/srs";
import { displayReading, type StudyKanji } from "@/lib/study";
import { KanjiNoteSnippet } from "../KanjiNoteSnippet";
import { SessionProgress, SessionSummary, type SessionResult } from "./SessionSummary";

const GRADE_LABELS: Record<Grade, string> = { forgot: "Forgot", hard: "Hard", good: "Good", easy: "Easy" };
const GRADE_STYLES: Record<Grade, string> = {
  forgot: "border-danger bg-danger-soft text-danger",
  hard: "border-border bg-surface",
  good: "border-success bg-success-soft text-success",
  easy: "border-accent bg-accent-soft text-accent",
};
// Only read in event handlers and after reveal, never during the server render.
const now = () => Date.now();

/**
 * Self-graded flashcards: recall the kanji's meaning and readings, reveal,
 * then grade how well you knew it. The grade schedules the next review.
 */
export function Flashcards({
  cards,
  onAnswer,
  onFinish,
  onRestart,
  onRetry,
  onExit,
  scheduleOf,
}: {
  cards: StudyKanji[];
  onAnswer?: (kanji: StudyKanji, correct: boolean, grade: Grade) => void;
  onFinish?: (results: SessionResult[]) => void;
  onRestart: () => void;
  onRetry: (cards: StudyKanji[]) => void;
  onExit: () => void;
  /** The kanji's current schedule, to preview when each grade would bring it back. */
  scheduleOf?: (character: string) => SrsState | undefined;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const card = cards[index];
  const done = index >= cards.length;

  const grade = (g: Grade) => {
    if (!card || !revealed) return;
    const correct = g !== "forgot";
    const next = [...results, { kanji: card, correct }];
    setResults(next);
    onAnswer?.(card, correct, g);
    setRevealed(false);
    setIndex(index + 1);
    if (index + 1 >= cards.length) onFinish?.(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      // A focused button already handles Enter/Space itself.
      if (!revealed && (e.key === " " || e.key === "Enter") && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) grade(GRADES[Number(e.key) - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    return (
      <SessionSummary title="Flashcards done" results={results} onRetryMissed={onRetry} onRestart={onRestart} onExit={onExit} />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <SessionProgress index={index} total={cards.length} />
      <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <p lang="ja" className="font-serif text-8xl leading-none">
          {card.character}
        </p>
        {revealed ? (
          <div className="space-y-2" aria-live="polite">
            <p className="text-lg font-medium">{card.meanings.join(", ") || "No English meaning"}</p>
            <p lang="ja" className="text-muted">
              {card.onyomi.length > 0 && <span>{card.onyomi.join("、")}</span>}
              {card.onyomi.length > 0 && card.kunyomi.length > 0 && <span className="mx-2">·</span>}
              {card.kunyomi.length > 0 && <span>{card.kunyomi.map(displayReading).join("、")}</span>}
            </p>
            <KanjiNoteSnippet character={card.character} className="mx-auto max-w-sm" />
            <Link href={kanjiHref(card.character)} target="_blank" className="inline-block text-xs text-accent hover:underline">
              Open kanji page ↗
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">Recall its meaning and readings, then reveal.</p>
        )}
      </div>
      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g, i) => {
            const t = now();
            const when = dueLabel(schedule(scheduleOf?.(card.character), g, t).due, t);
            return (
              <button
                key={g}
                type="button"
                onClick={() => grade(g)}
                className={`flex flex-col items-center rounded-lg border px-2 py-2.5 font-medium ${GRADE_STYLES[g]}`}
              >
                <span>
                  {GRADE_LABELS[g]} <kbd className="text-xs opacity-70">{i + 1}</kbd>
                </span>
                <span className="text-xs font-normal opacity-80">{when}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-accent-foreground">
          Show answer <kbd className="ml-1 text-xs opacity-70">Space</kbd>
        </button>
      )}
    </div>
  );
}
