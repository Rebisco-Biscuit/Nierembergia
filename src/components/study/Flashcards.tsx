"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { kanjiHref } from "@/lib/format";
import { displayReading, type StudyKanji } from "@/lib/study";
import { SessionProgress, SessionSummary, type SessionResult } from "./SessionSummary";

/**
 * Self-graded flashcards: recall the kanji's meaning and readings, reveal,
 * then say whether you knew it.
 */
export function Flashcards({
  cards,
  onAnswer,
  onFinish,
  onRestart,
  onRetry,
  onExit,
}: {
  cards: StudyKanji[];
  onAnswer?: (kanji: StudyKanji, correct: boolean) => void;
  onFinish?: (results: SessionResult[]) => void;
  onRestart: () => void;
  onRetry: (cards: StudyKanji[]) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const card = cards[index];
  const done = index >= cards.length;

  const grade = (correct: boolean) => {
    if (!card || !revealed) return;
    const next = [...results, { kanji: card, correct }];
    setResults(next);
    onAnswer?.(card, correct);
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
      } else if (revealed && (e.key === "1" || e.key === "ArrowLeft")) grade(false);
      else if (revealed && (e.key === "2" || e.key === "ArrowRight")) grade(true);
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
            <Link href={kanjiHref(card.character)} target="_blank" className="inline-block text-xs text-accent hover:underline">
              Open kanji page ↗
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted">Recall its meaning and readings, then reveal.</p>
        )}
      </div>
      {revealed ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => grade(false)} className="rounded-lg border border-danger bg-danger-soft px-4 py-3 font-medium text-danger">
            Didn&apos;t know <kbd className="ml-1 text-xs opacity-70">1</kbd>
          </button>
          <button type="button" onClick={() => grade(true)} className="rounded-lg border border-success bg-success-soft px-4 py-3 font-medium text-success">
            Knew it <kbd className="ml-1 text-xs opacity-70">2</kbd>
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-accent-foreground">
          Show answer <kbd className="ml-1 text-xs opacity-70">Space</kbd>
        </button>
      )}
    </div>
  );
}
