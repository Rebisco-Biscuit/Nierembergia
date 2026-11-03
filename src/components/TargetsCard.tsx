"use client";

import { useState } from "react";
import { clampTarget, MAX_TARGET, type Progress, type Targets } from "@/lib/progress";
import { targetStreak, todayTargets, type TargetStatus } from "@/lib/targets";

// Rendered only after hydration, so the clock is read in the browser.
const now = () => Date.now();

function Meter({ label, status }: { label: string; status: TargetStatus }) {
  if (status.goal === 0) return null;
  return (
    <div className="min-w-40 flex-1">
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          <strong>{status.done}</strong>
          <span className="text-muted"> / {status.goal}</span>
          {status.met && <span className="ml-1 text-success">✓</span>}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-background"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={status.goal}
        aria-valuenow={Math.min(status.done, status.goal)}
      >
        <span
          className={`block h-full rounded-full ${status.met ? "bg-success" : "bg-accent"}`}
          style={{ width: `${status.fraction * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Today's progress toward the daily targets, with a form to change them. */
export function TargetsCard({ progress, onChange }: { progress: Progress; onChange: (targets: Targets) => void }) {
  const [editing, setEditing] = useState<Targets | null>(null);
  const today = todayTargets(progress, now());
  const streak = targetStreak(progress, now());

  if (editing) {
    const field = (key: keyof Targets, label: string, hint: string) => (
      <label className="flex flex-col gap-1 text-sm">
        <span>{label}</span>
        <input
          type="number"
          min={0}
          max={MAX_TARGET}
          inputMode="numeric"
          value={editing[key]}
          onChange={(e) => setEditing({ ...editing, [key]: clampTarget(e.target.valueAsNumber) })}
          className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 tabular-nums"
        />
        <span className="text-xs text-muted">{hint}</span>
      </label>
    );
    return (
      <form
        className="space-y-4 rounded-2xl border border-border bg-surface p-5"
        aria-label="Daily targets"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(editing);
          setEditing(null);
        }}
      >
        <h2 className="font-medium">Daily targets</h2>
        <div className="flex flex-wrap gap-6">
          {field("answers", "Answers per day", "Flashcards and quiz questions")}
          {field("newKanji", "New kanji per day", "Kanji you answer for the first time")}
        </div>
        <p className="text-xs text-muted">Set a target to 0 to turn it off.</p>
        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            Save targets
          </button>
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section aria-labelledby="targets-heading" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="targets-heading" className="font-medium">
          Today&apos;s targets
          {today.met && <span className="ml-2 text-sm font-normal text-success">Done for today ✓</span>}
        </h2>
        <button
          type="button"
          onClick={() => setEditing(progress.targets)}
          className="text-sm text-muted hover:text-foreground"
        >
          {today.anySet ? "Edit targets" : "Set targets"}
        </button>
      </div>
      {today.anySet ? (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Meter label="Answers" status={today.answers} />
            <Meter label="New kanji" status={today.newKanji} />
          </div>
          <p className="text-xs text-muted">
            {streak > 0
              ? `Targets met ${streak} day${streak === 1 ? "" : "s"} in a row.`
              : "Meet your targets on consecutive days to build a streak."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">No daily targets set.</p>
      )}
    </section>
  );
}
