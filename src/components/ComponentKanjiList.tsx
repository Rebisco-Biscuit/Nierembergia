"use client";

import { useState } from "react";
import { tally, type ComponentUseItem } from "@/lib/component-explorer";
import { positionLabel } from "@/lib/decomposition";
import type { JlptLevel } from "@/lib/types";
import { KanjiTile } from "./KanjiTile";

const JLPT_LEVELS: JlptLevel[] = [5, 4, 3, 2, 1];
const PARTNERS_SHOWN = 12;

type Sort = "frequency" | "strokes";

/** The kanji containing a component, filterable by level, strokes, position, and partner. */
export function ComponentKanjiList({ character, uses }: { character: string; uses: ComponentUseItem[] }) {
  const [jlpt, setJlpt] = useState<Set<JlptLevel>>(new Set());
  const [commonOnly, setCommonOnly] = useState(false);
  const [maxStrokes, setMaxStrokes] = useState<number | null>(null);
  const [position, setPosition] = useState<string | null | undefined>(undefined);
  const [partner, setPartner] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("frequency");

  const positions = tally(uses.map((u) => u.position));
  // A partner seen only once (a one-off sound component) isn't a useful grouping.
  const partners = tally(uses.flatMap((u) => u.partners))
    .filter((p) => p.count >= 2)
    .slice(0, PARTNERS_SHOWN);
  const strokeMax = Math.max(...uses.map((u) => u.strokes));

  const shown = uses
    .filter((u) => jlpt.size === 0 || (u.jlpt !== null && jlpt.has(u.jlpt)))
    .filter((u) => !commonOnly || u.frequency !== null)
    .filter((u) => maxStrokes === null || u.strokes <= maxStrokes)
    .filter((u) => position === undefined || u.position === position)
    .filter((u) => partner === null || u.partners.includes(partner));
  if (sort === "strokes") shown.sort((a, b) => a.strokes - b.strokes);

  const filtered = jlpt.size > 0 || commonOnly || maxStrokes !== null || position !== undefined || partner !== null;
  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-sm transition-colors ${
      active ? "bg-accent text-accent-foreground" : "border border-border text-muted hover:border-accent hover:text-foreground"
    }`;

  return (
    <div className="space-y-5">
      {positions.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-xs text-muted">
            Where <span lang="ja">{character}</span> sits
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {positions.map(({ value, count }) => (
              <button
                key={value ?? "none"}
                type="button"
                aria-pressed={position === value}
                onClick={() => setPosition(position === value ? undefined : value)}
                className={chip(position === value)}
              >
                {value === null ? "unmarked" : (positionLabel(value) ?? value)} · {count}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {partners.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-xs text-muted">Often combined with</legend>
          <div className="flex flex-wrap gap-1.5">
            {partners.map(({ value, count }) => (
              <button
                key={value}
                type="button"
                aria-pressed={partner === value}
                onClick={() => setPartner(partner === value ? null : value)}
                className={chip(partner === value)}
              >
                <span lang="ja" className="font-serif">
                  {value}
                </span>{" "}
                · {count}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">JLPT level</legend>
          <span className="mr-1 text-muted" aria-hidden>
            JLPT
          </span>
          {JLPT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={jlpt.has(level)}
              onClick={() => {
                const next = new Set(jlpt);
                if (next.has(level)) next.delete(level);
                else next.add(level);
                setJlpt(next);
              }}
              className={chip(jlpt.has(level))}
            >
              N{level}
            </button>
          ))}
        </fieldset>
        <label className="flex items-center gap-2">
          <span className="text-muted">Max strokes</span>
          <input
            type="range"
            min={1}
            max={strokeMax}
            value={maxStrokes ?? strokeMax}
            onChange={(e) => setMaxStrokes(Number(e.target.value) >= strokeMax ? null : Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
          <span className="w-6 tabular-nums">{maxStrokes ?? strokeMax}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={commonOnly}
            onChange={(e) => setCommonOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Common only <span className="text-muted">(top 2,500)</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-border bg-surface px-2 py-1"
          >
            <option value="frequency">Most frequent</option>
            <option value="strokes">Fewest strokes</option>
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setJlpt(new Set());
              setCommonOnly(false);
              setMaxStrokes(null);
              setPosition(undefined);
              setPartner(null);
            }}
            className="text-accent underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {shown.length === uses.length
          ? `${uses.length.toLocaleString("en")} kanji`
          : `${shown.length.toLocaleString("en")} of ${uses.length.toLocaleString("en")} kanji`}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No kanji match these filters.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {shown.map((u) => (
            <li key={u.character}>
              <KanjiTile kanji={{ character: u.character, meanings: u.meaning ? [u.meaning] : [] }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
