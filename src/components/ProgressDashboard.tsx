"use client";

import Link from "next/link";
import { useState } from "react";
import {
  accuracyByKind,
  activityByDay,
  formatDuration,
  hardestKanji,
  jlptBreakdown,
  totalStudyTime,
  weakComponents,
  weakReadings,
  type DashboardKanji,
  type DayPoint,
} from "@/lib/dashboard";
import { componentHref, displayReading, kanjiHref } from "@/lib/format";
import { MASTERED_STREAK, summarize } from "@/lib/progress";
import { ReadingList, Romaji } from "./Romaji";
import { TargetsCard } from "./TargetsCard";
import { useHydrated, useProgress } from "./useLibrary";

// The dashboard renders only after hydration, so the clock is read in the browser.
const now = () => Date.now();

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const plural = (n: number, word: string) => `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;

const KIND_LABELS: Record<string, string> = {
  meaning: "Kanji → meaning",
  kanji: "Meaning → kanji",
  reading: "Readings",
  missing: "Missing part",
  contains: "Contains a part",
  build: "Build from parts",
  lookalike: "Look-alikes",
};

const RANGES = { week: { label: "Week", days: 7 }, month: { label: "Month", days: 30 } } as const;
type Range = keyof typeof RANGES;

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const dayLabel = (day: string, style: "short" | "weekday") => {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return style === "weekday"
    ? date.toLocaleDateString("en", { weekday: "short" })
    : date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

/** Answers per day as bars; hovering or focusing a bar shows the day's numbers. */
function ActivityChart({ days, range, target }: { days: DayPoint[]; range: Range; target: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, target, ...days.map((d) => d.answers));
  const shown = active === null ? null : days[active];
  const labelEvery = range === "week" ? 1 : 5;

  return (
    <div>
      <p className="mb-2 h-5 text-sm text-muted" aria-live="polite">
        {shown
          ? `${dayLabel(shown.day, "short")}: ${plural(shown.answers, "answer")}, ${pct(shown.answers ? shown.correct / shown.answers : null)} correct, ${shown.learned} new, ${formatDuration(shown.ms)}`
          : "Answers per day"}
      </p>
      <div>
        <div className="relative h-40">
          {/* Recessive grid: the top line marks the scale's top (busiest day or target). */}
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden />
          <span className="absolute right-0 -top-5 text-xs text-muted tabular-nums" aria-hidden>
            {max}
          </span>
          {target > 0 && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-foreground/50"
              style={{ bottom: `${(target / max) * 100}%` }}
              aria-hidden
            >
              <span className="absolute -top-5 left-0 rounded bg-surface px-1 text-xs text-muted">
                Daily target {target}
              </span>
            </div>
          )}
          <ol className="flex h-full items-end gap-[2px] border-b border-border" aria-label="Answers per day">
            {days.map((d, i) => (
              <li
                key={d.day}
                className="flex h-full min-w-0 flex-1 items-end"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <button
                  type="button"
                  className="flex h-full w-full items-end focus-visible:outline-2 focus-visible:outline-accent"
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${dayLabel(d.day, "short")}: ${plural(d.answers, "answer")}, ${d.correct} correct`}
                >
                  <span
                    className={`w-full rounded-t-[4px] ${active === i ? "bg-foreground" : "bg-accent"}`}
                    style={{ height: d.answers ? `${Math.max(2, (d.answers / max) * 100)}%` : 0 }}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
        <ol className="mt-1 flex gap-[2px] text-xs text-muted" aria-hidden>
          {days.map((d, i) => (
            <li key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
              {(days.length - 1 - i) % labelEvery === 0 ? dayLabel(d.day, range === "week" ? "weekday" : "short") : ""}
            </li>
          ))}
        </ol>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-normal">Day</th>
              <th className="py-1 font-normal">Answers</th>
              <th className="py-1 font-normal">Correct</th>
              <th className="py-1 font-normal">New</th>
              <th className="py-1 font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-border">
                <td className="py-1">{dayLabel(d.day, "short")}</td>
                <td className="py-1">{d.answers}</td>
                <td className="py-1">{d.correct}</td>
                <td className="py-1">{d.learned}</td>
                <td className="py-1">{formatDuration(d.ms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function KanjiLink({
  character,
  meaning,
  reading,
  detail,
}: {
  character: string;
  meaning?: string;
  reading?: string;
  detail: string;
}) {
  return (
    <Link
      href={kanjiHref(character)}
      title={meaning}
      className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border bg-background px-1 py-2 hover:border-accent"
    >
      <span lang="ja" className="font-serif text-3xl leading-none">
        {character}
      </span>
      {reading && (
        <span className="flex w-full flex-col text-center text-xs leading-tight">
          <span lang="ja" className="truncate">
            {displayReading(reading)}
          </span>
          <Romaji reading={displayReading(reading)} className="truncate" />
        </span>
      )}
      <span className="w-full truncate text-center text-xs text-muted">{detail}</span>
    </Link>
  );
}

export function ProgressDashboard({ kanji }: { kanji: DashboardKanji[] }) {
  const [progress, updateProgress] = useProgress();
  const hydrated = useHydrated();
  const [range, setRange] = useState<Range>("week");

  if (!hydrated) {
    return (
      <div
        className="mt-8 h-64 animate-pulse rounded-2xl border border-border bg-surface"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  const at = now();
  const summary = summarize(progress, at);
  const explored = Object.keys(progress.explored).length;
  if (summary.answers === 0 && explored === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border px-5 py-8 text-center">
        <p className="font-medium">No progress yet</p>
        <p className="mt-1 text-sm text-muted">
          Open a few{" "}
          <Link href="/" className="text-accent hover:underline">
            kanji pages
          </Link>{" "}
          or start a{" "}
          <Link href="/study" className="text-accent hover:underline">
            study session
          </Link>
          ; your progress is saved in this browser and shows up here.
        </p>
      </div>
    );
  }

  const byChar = new Map(kanji.map((k) => [k.character, k]));
  const days = activityByDay(progress, RANGES[range].days, at);
  const totals = days.reduce(
    (t, d) => ({
      answers: t.answers + d.answers,
      correct: t.correct + d.correct,
      learned: t.learned + d.learned,
      ms: t.ms + d.ms,
    }),
    { answers: 0, correct: 0, learned: 0, ms: 0 },
  );
  const levels = jlptBreakdown(progress, kanji);
  const kinds = Object.entries(accuracyByKind(progress)).sort(
    ([a], [b]) => Object.keys(KIND_LABELS).indexOf(a) - Object.keys(KIND_LABELS).indexOf(b),
  );
  const hardest = hardestKanji(progress, 12);
  const readings = weakReadings(progress, 8);
  const components = weakComponents(progress, kanji, 6);

  const stats: [string, string, string?][] = [
    ["Kanji explored", explored.toLocaleString("en"), "pages visited"],
    ["Kanji studied", summary.studied.toLocaleString("en")],
    ["Mastered", summary.mastered.toLocaleString("en"), `${MASTERED_STREAK} right in a row`],
    ["Due for review", summary.due.length.toLocaleString("en")],
    ["Accuracy", pct(summary.accuracy), plural(summary.answers, "answer")],
    ["Day streak", plural(summary.dayStreak, "day")],
    ["Study time", formatDuration(totalStudyTime(progress)), "in finished sessions"],
    ["Sessions", summary.sessions.toLocaleString("en")],
  ];

  return (
    <div className="mt-8 space-y-6">
      <TargetsCard progress={progress} onChange={(targets) => updateProgress((p) => ({ ...p, targets }))} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-border bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
            {hint && <dd className="text-xs text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>
      {summary.due.length > 0 && (
        <p className="text-sm">
          <Link href="/study" className="font-medium text-accent hover:underline">
            Review the {plural(summary.due.length, "kanji")} due →
          </Link>
        </p>
      )}

      <Section
        title="Activity"
        action={
          <div className="flex gap-1" role="group" aria-label="Time range">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`rounded-lg border px-3 py-1 text-sm ${range === r ? "border-accent bg-accent-soft" : "border-border"}`}
              >
                {RANGES[r].label}
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-4 text-sm">
          Last {RANGES[range].days} days: <strong>{plural(totals.answers, "answer")}</strong>,{" "}
          {pct(totals.answers ? totals.correct / totals.answers : null)} correct, {totals.learned} new kanji,{" "}
          {formatDuration(totals.ms)}.
        </p>
        <ActivityChart days={days} range={range} target={progress.targets.answers} />
      </Section>

      <Section title="Progress by JLPT level">
        <ul className="mb-3 flex gap-4 text-xs text-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-accent" aria-hidden /> Mastered
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-chart-learning" aria-hidden /> Learning
          </li>
        </ul>
        <ul className="space-y-3">
          {levels.map((l) => (
            <li key={l.level}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">N{l.level}</span>
                <span className="text-muted tabular-nums">
                  {l.mastered} mastered · {l.studied} studied of {l.total}
                </span>
              </div>
              <div
                className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-background"
                role="img"
                aria-label={`N${l.level}: ${l.mastered} mastered, ${l.studied - l.mastered} learning, of ${l.total}`}
              >
                {l.mastered > 0 && <span className="bg-accent" style={{ width: `${(l.mastered / l.total) * 100}%` }} />}
                {l.studied > l.mastered && (
                  <span
                    className="bg-chart-learning"
                    style={{ width: `${((l.studied - l.mastered) / l.total) * 100}%` }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Most difficult kanji">
          {hardest.length === 0 ? (
            <p className="text-sm text-muted">Kanji you get wrong more than once show up here.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {hardest.map((h) => (
                <li key={h.character}>
                  <KanjiLink
                    character={h.character}
                    meaning={byChar.get(h.character)?.meaning}
                    reading={byChar.get(h.character)?.readings[0]}
                    detail={`${pct(h.accuracy)} of ${h.seen}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Quiz accuracy by question">
          {kinds.length === 0 ? (
            <p className="text-sm text-muted">Take a quiz to see which kinds of question are hardest.</p>
          ) : (
            <ul className="space-y-2">
              {kinds.map(([kind, t]) => (
                <li key={kind} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>{KIND_LABELS[kind] ?? kind}</span>
                    <span className="text-muted tabular-nums">
                      {pct(t.correct / t.seen)} of {t.seen}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(t.correct / t.seen) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Weak readings">
          {readings.length === 0 ? (
            <p className="text-sm text-muted">
              Kanji whose reading questions you miss more often than not show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {readings.map((r) => (
                <li key={r.character} className="flex items-baseline gap-3 py-2">
                  <Link href={kanjiHref(r.character)} lang="ja" className="font-serif text-2xl hover:text-accent">
                    {r.character}
                  </Link>
                  <span className="min-w-0 flex-1">
                    <ReadingList readings={byChar.get(r.character)?.readings ?? []} />
                  </span>
                  <span className="text-muted tabular-nums">
                    {pct(r.accuracy)} of {r.seen}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Weak components">
          {components.length === 0 ? (
            <p className="text-sm text-muted">
              Components shared by several kanji you often miss show up here, once you&apos;ve studied a few.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {components.map((c) => (
                <li key={c.component} className="flex items-center gap-3 py-2">
                  <Link href={componentHref(c.component)} lang="ja" className="font-serif text-2xl hover:text-accent">
                    {c.component}
                  </Link>
                  <span lang="ja" className="min-w-0 flex-1 truncate font-serif text-lg">
                    {c.kanji.map((k) => (
                      <Link key={k} href={kanjiHref(k)} className="mr-1 hover:text-accent">
                        {k}
                      </Link>
                    ))}
                  </span>
                  <span className="text-muted tabular-nums">
                    {pct(c.accuracy)} of {c.seen}
                  </span>
                  <Link
                    href={`/study?component=${encodeURIComponent(c.component)}`}
                    className="text-accent hover:underline"
                    aria-label={`Study kanji containing ${c.component}`}
                  >
                    Study
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
