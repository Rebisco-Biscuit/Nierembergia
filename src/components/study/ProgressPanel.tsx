"use client";

import { useState } from "react";
import { KanjiTile } from "@/components/KanjiTile";
import { MASTERED_STREAK, summarize, type Progress } from "@/lib/progress";
import { dueLabel } from "@/lib/srs";
import type { StudyKanji } from "@/lib/study";

const WEAK_SHOWN = 12;
const RECENT_SHOWN = 5;
// Read the clock outside render-time hooks; the panel only renders in the browser.
const now = () => Date.now();

const formatPct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

export function ProgressPanel({
  progress,
  byChar,
  onStudyWeak,
  onReset,
  dueCount,
  nextDue,
  onReviewDue,
}: {
  progress: Progress;
  byChar: Map<string, StudyKanji>;
  onStudyWeak: () => void;
  onReset: () => void;
  dueCount: number;
  nextDue: number | null;
  onReviewDue: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const summary = summarize(progress, now());
  const recent = progress.sessions.slice(-RECENT_SHOWN).reverse();
  const weak = summary.weak.flatMap((c) => byChar.get(c) ?? []);

  if (summary.answers === 0) {
    return (
      <section aria-labelledby="progress-heading" className="rounded-2xl border border-dashed border-border px-5 py-6">
        <h2 id="progress-heading" className="font-medium">
          Your progress
        </h2>
        <p className="mt-1 text-sm text-muted">
          Nothing yet. Answers from flashcards and quizzes are saved in this browser and show up here.
        </p>
      </section>
    );
  }

  const stats: [string, string, string?][] = [
    ["Kanji studied", summary.studied.toLocaleString("en")],
    ["Accuracy", formatPct(summary.accuracy), `${summary.answers.toLocaleString("en")} answers`],
    ["Mastered", summary.mastered.toLocaleString("en"), `${MASTERED_STREAK} right in a row`],
    ["Day streak", `${summary.dayStreak} day${summary.dayStreak === 1 ? "" : "s"}`],
  ];

  return (
    <section aria-labelledby="progress-heading" className="space-y-6 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="progress-heading" className="font-medium">
          Your progress
        </h2>
        {confirmReset ? (
          <span className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className="font-medium text-danger"
            >
              Erase all progress
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="text-muted">
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {dueCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3">
          <p>
            <strong className="text-accent">{dueCount}</strong> kanji due for review
          </p>
          <button
            type="button"
            onClick={onReviewDue}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Review now
          </button>
        </div>
      ) : (
        nextDue !== null && <p className="text-sm text-muted">Nothing due. Next review {dueLabel(nextDue, now())}.</p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl bg-background px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
            {hint && <dd className="text-xs text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>

      {weak.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">
              Weak kanji <span className="font-normal text-muted">(missed last time) · {weak.length}</span>
            </h3>
            <button type="button" onClick={onStudyWeak} className="text-sm font-medium text-accent hover:underline">
              Study these →
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {weak.slice(0, WEAK_SHOWN).map((k) => (
              <li key={k.character}>
                <KanjiTile kanji={k} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Recent sessions</h3>
          <ul className="divide-y divide-border text-sm">
            {recent.map((s) => (
              <li key={s.at} className="flex justify-between py-1.5">
                <span>
                  {s.mode === "quiz" ? "Quiz" : "Flashcards"}{" "}
                  <span className="text-muted">
                    · {new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </span>
                <span className="tabular-nums">
                  {s.correct}/{s.total}{" "}
                  <span className="text-muted">({formatPct(s.total ? s.correct / s.total : null)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
