"use client";

import { KanjiTile } from "@/components/KanjiTile";
import type { StudyKanji } from "@/lib/study";

export interface SessionResult {
  kanji: StudyKanji;
  correct: boolean;
}

export function SessionSummary({
  title,
  results,
  onRetryMissed,
  onRestart,
  onExit,
}: {
  title: string;
  results: SessionResult[];
  onRetryMissed: (missed: StudyKanji[]) => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct).map((r) => r.kanji);
  const pct = results.length ? Math.round((correct / results.length) * 100) : 0;

  return (
    <div className="space-y-6" aria-live="polite">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-muted">
          <strong className="text-foreground">{correct}</strong> of {results.length} correct ({pct}%)
        </p>
      </div>
      {missed.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium">To review</h3>
          <ul className="flex flex-wrap gap-2">
            {missed.map((k) => (
              <li key={k.character}>
                <KanjiTile kanji={k} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-success">Everything right. Nice work!</p>
      )}
      <div className="flex flex-wrap gap-2">
        {missed.length > 0 && (
          <button type="button" onClick={() => onRetryMissed(missed)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            Review the {missed.length} missed
          </button>
        )}
        <button type="button" onClick={onRestart} className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent">
          Start over
        </button>
        <button type="button" onClick={onExit} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
          Choose another deck
        </button>
      </div>
    </div>
  );
}

/** "3 / 10" with a progress bar. */
export function SessionProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span>
        {Math.min(index + 1, total)} / {total}
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-label="Session progress"
      >
        <div className="h-full bg-accent transition-[width]" style={{ width: `${(index / total) * 100}%` }} />
      </div>
    </div>
  );
}
