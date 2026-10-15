"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { GRADE_OPTIONS } from "@/lib/search-params";

const JLPT_LEVELS = [5, 4, 3, 2, 1] as const;
const DEBOUNCE_MS = 250;

export function SearchControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  // Queries we've pushed to the URL that haven't landed yet, oldest first.
  const [pending, setPending] = useState<string[]>([]);
  // Follow the URL when it changes underneath us (back/forward, links), but
  // not when it's just one of our own debounced pushes catching up.
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    const i = pending.indexOf(urlQuery);
    if (i >= 0) {
      setPending(pending.slice(i + 1));
    } else {
      setPending([]);
      setQuery(urlQuery);
    }
  }

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // any change starts over at page 1
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounce.current), []);
  const onQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const q = value.trim();
      if (q === urlQuery) return;
      setPending((p) => [...p, q]);
      update({ q: q || null });
    }, DEBOUNCE_MS);
  };

  const jlpt = new Set((searchParams.get("jlpt") ?? "").split(",").filter(Boolean));
  const toggleJlpt = (level: number) => {
    const key = String(level);
    if (jlpt.has(key)) jlpt.delete(key);
    else jlpt.add(key);
    update({ jlpt: [...jlpt].sort().reverse().join(",") || null });
  };

  const hasFilters = ["jlpt", "grade", "min", "max"].some((k) => searchParams.has(k));

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="kanji-search" className="sr-only">
          Search kanji
        </label>
        <input
          id="kanji-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="水 · みず · mizu · water · r:85"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg shadow-sm outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <span
          aria-hidden
          className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted transition-opacity ${isPending ? "opacity-100" : "opacity-0"}`}
        >
          Searching…
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">JLPT level</legend>
          <span className="mr-1 text-muted" aria-hidden>
            JLPT
          </span>
          {JLPT_LEVELS.map((level) => {
            const active = jlpt.has(String(level));
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => toggleJlpt(level)}
                className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted hover:border-accent hover:text-foreground"
                }`}
              >
                N{level}
              </button>
            );
          })}
        </fieldset>

        <label className="flex items-center gap-2">
          <span className="text-muted">Grade</span>
          <select
            value={searchParams.get("grade") ?? ""}
            onChange={(e) => update({ grade: e.target.value || null })}
            className="rounded-lg border border-border bg-surface px-2 py-1"
          >
            <option value="">Any</option>
            {GRADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Stroke count</legend>
          <span className="text-muted" aria-hidden>
            Strokes
          </span>
          <StrokeInput
            label="Minimum strokes"
            value={searchParams.get("min") ?? ""}
            onCommit={(v) => update({ min: v })}
          />
          <span className="text-muted" aria-hidden>
            –
          </span>
          <StrokeInput
            label="Maximum strokes"
            value={searchParams.get("max") ?? ""}
            onCommit={(v) => update({ max: v })}
          />
        </fieldset>

        {hasFilters && (
          <button
            type="button"
            onClick={() => update({ jlpt: null, grade: null, min: null, max: null })}
            className="text-accent underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function StrokeInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string | null) => void;
}) {
  return (
    <input
      // Remount when the URL value changes so the field shows it.
      key={value}
      type="number"
      inputMode="numeric"
      min={1}
      max={40}
      aria-label={label}
      defaultValue={value}
      onBlur={(e) => e.target.value !== value && onCommit(e.target.value || null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-16 rounded-lg border border-border bg-surface px-2 py-1"
    />
  );
}
