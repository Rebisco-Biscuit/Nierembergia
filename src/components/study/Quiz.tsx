"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { kanjiHref } from "@/lib/format";
import { QUESTION_PROMPTS, readingsOf, type Question, type StudyKanji } from "@/lib/study";
import { SessionProgress, SessionSummary, type SessionResult } from "./SessionSummary";

function describe(k: StudyKanji) {
  const readings = readingsOf(k);
  return (
    <>
      <span lang="ja" className="font-serif text-lg">
        {k.character}
      </span>{" "}
      means “{k.meanings.join(", ") || "—"}”
      {readings.length > 0 && (
        <>
          , read <span lang="ja">{readings.join("・")}</span>
        </>
      )}
    </>
  );
}

export function Quiz({
  questions,
  onAnswer,
  onFinish,
  onRestart,
  onRetry,
  onExit,
}: {
  questions: Question[];
  onAnswer?: (kanji: StudyKanji, correct: boolean) => void;
  onFinish?: (results: SessionResult[]) => void;
  onRestart: () => void;
  onRetry: (missed: StudyKanji[]) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const question = questions[index];
  const done = index >= questions.length;

  const choose = (i: number) => {
    if (chosen !== null || !question) return;
    setChosen(i);
    const correct = i === question.answer;
    setResults((r) => [...r, { kanji: question.target, correct }]);
    onAnswer?.(question.target, correct);
  };

  const next = () => {
    if (chosen === null) return;
    setChosen(null);
    setIndex(index + 1);
    if (index + 1 >= questions.length) onFinish?.(results);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || e.metaKey || e.ctrlKey) return;
      const n = Number(e.key);
      if (chosen === null && n >= 1 && n <= (question?.options.length ?? 0)) choose(n - 1);
      // A focused button already handles Enter/Space itself; don't advance twice.
      else if (chosen !== null && (e.key === "Enter" || e.key === " ") && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    return <SessionSummary title="Quiz done" results={results} onRetryMissed={onRetry} onRestart={onRestart} onExit={onExit} />;
  }

  const { kind, target, options, answer } = question;
  const answered = chosen !== null;
  const wasRight = chosen === answer;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <SessionProgress index={index} total={questions.length} />
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">{QUESTION_PROMPTS[kind]}</p>
        {kind === "kanji" ? (
          <p className="mt-3 text-2xl font-medium">“{target.meanings[0]}”</p>
        ) : (
          <p lang="ja" className="mt-3 font-serif text-8xl leading-none">
            {target.character}
          </p>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const isAnswer = i === answer;
          const isChosen = i === chosen;
          const style = !answered
            ? "border-border bg-surface hover:border-accent"
            : isAnswer
              ? "border-success bg-success-soft text-success"
              : isChosen
                ? "border-danger bg-danger-soft text-danger"
                : "border-border bg-surface opacity-60";
          return (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${style}`}
              >
                <kbd className="text-xs text-muted">{i + 1}</kbd>
                <span lang={kind === "meaning" ? undefined : "ja"} className={kind === "kanji" ? "font-serif text-3xl" : "text-lg"}>
                  {o.label}
                </span>
                {answered && isAnswer && <span className="ml-auto text-sm" aria-label="correct answer">✓</span>}
                {answered && isChosen && !isAnswer && <span className="ml-auto text-sm" aria-label="your answer">✗</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm" aria-live="polite">
          <p className={`font-medium ${wasRight ? "text-success" : "text-danger"}`}>{wasRight ? "Correct!" : "Not quite."}</p>
          <p>{describe(target)}.</p>
          {!wasRight && (
            <p className="text-muted">
              You picked “{options[chosen].label}”: that&apos;s {describe(options[chosen].kanji)}.
            </p>
          )}
          <div className="flex items-center justify-between">
            <Link href={kanjiHref(target.character)} target="_blank" className="text-xs text-accent hover:underline">
              Open kanji page ↗
            </Link>
            <button type="button" onClick={next} autoFocus className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground">
              {index + 1 < questions.length ? "Next" : "See results"} <kbd className="ml-1 text-xs opacity-70">Enter</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
