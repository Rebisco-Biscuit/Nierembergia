"use client";

import { accuracyOf, dayKey, isMastered, isWeak } from "@/lib/progress";
import { useProgress } from "./useLibrary";

// The component renders nothing on the server (empty progress), so reading
// the clock here only ever happens in the browser.
const now = () => Date.now();

function lastSeenLabel(timestamp: number): string {
  const today = new Date(now());
  if (dayKey(timestamp) === dayKey(today.getTime())) return "today";
  today.setDate(today.getDate() - 1);
  if (dayKey(timestamp) === dayKey(today.getTime())) return "yesterday";
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The user's study history for one kanji; nothing if it hasn't been studied. */
export function KanjiProgress({ character }: { character: string }) {
  const [progress] = useProgress();
  const stats = progress.kanji[character];
  if (!stats) return null;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      <span>
        Studied {stats.seen}× · {Math.round(accuracyOf(stats) * 100)}% correct · last seen{" "}
        {lastSeenLabel(stats.lastSeen)}
      </span>
      {isMastered(stats) && (
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Mastered</span>
      )}
      {isWeak(stats) && (
        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Missed last time</span>
      )}
    </p>
  );
}
