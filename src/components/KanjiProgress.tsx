"use client";

import { accuracyOf, dayKey, isMastered, isWeak, recordAnswer } from "@/lib/progress";
import { dueLabel, isDue, type Grade } from "@/lib/srs";
import { useProgress } from "./useLibrary";

// Stats only render once the browser's progress has loaded, and marks are
// event handlers, so the clock is never read during the server render.
const now = () => Date.now();

function lastSeenLabel(timestamp: number): string {
  const today = new Date(now());
  if (dayKey(timestamp) === dayKey(today.getTime())) return "today";
  today.setDate(today.getDate() - 1);
  if (dayKey(timestamp) === dayKey(today.getTime())) return "yesterday";
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The spec's easy / difficult / forgotten marks, as review grades. */
const MARKS: { grade: Grade; label: string }[] = [
  { grade: "easy", label: "Easy" },
  { grade: "hard", label: "Difficult" },
  { grade: "forgot", label: "Forgotten" },
];

/** The user's study history and review schedule for one kanji, plus quick marks. */
export function KanjiProgress({ character }: { character: string }) {
  const [progress, update] = useProgress();
  const stats = progress.kanji[character];
  const mark = (grade: Grade) => update((p) => recordAnswer(p, character, grade !== "forgot", now(), grade));

  return (
    <div className="mt-3 space-y-2 text-sm text-muted">
      {stats && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            Studied {stats.seen}× · {Math.round(accuracyOf(stats) * 100)}% correct · last seen{" "}
            {lastSeenLabel(stats.lastSeen)}
            {stats.srs && (
              <>
                {" · "}
                {isDue(stats.srs, now()) ? (
                  <span className="font-medium text-accent">due for review</span>
                ) : (
                  <>next review {dueLabel(stats.srs.due, now())}</>
                )}
              </>
            )}
          </span>
          {isMastered(stats) && (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Mastered</span>
          )}
          {isWeak(stats) && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
              Missed last time
            </span>
          )}
        </p>
      )}
      <p className="flex flex-wrap items-center gap-1.5">
        <span id={`mark-${character}`}>Mark as</span>
        {MARKS.map(({ grade, label }) => (
          <button
            key={grade}
            type="button"
            onClick={() => mark(grade)}
            aria-describedby={`mark-${character}`}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-accent hover:text-foreground"
          >
            {label}
          </button>
        ))}
      </p>
    </div>
  );
}
