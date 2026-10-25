"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { searchCatalog, type CatalogEntry } from "@/lib/component-explorer";
import { componentHref } from "@/lib/format";
import type { Radical } from "@/lib/types";

const PAGE = 120;

export function ComponentExplorer({ catalog, radicals }: { catalog: CatalogEntry[]; radicals: Radical[] }) {
  const [query, setQuery] = useState("");
  const [radicalsOnly, setRadicalsOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const deferredQuery = useDeferredValue(query);

  const results = searchCatalog(deferredQuery, catalog, radicals).filter(
    (c) => !radicalsOnly || c.radicalNumber !== null,
  );

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="component-search" className="sr-only">
          Search components
        </label>
        <input
          id="component-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="氵 · water · 85"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={radicalsOnly}
            onChange={(e) => setRadicalsOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Radicals only
        </label>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {results.length === 0
          ? "No components match."
          : `${results.length.toLocaleString("en")} component${results.length === 1 ? "" : "s"}, most used first`}
      </p>

      {results.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {results.slice(0, shown).map((c) => (
            <li key={c.character}>
              <Link
                href={componentHref(c.character)}
                className="flex h-full items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent"
              >
                <span lang="ja" className="w-10 shrink-0 text-center font-serif text-3xl leading-none">
                  {c.character}
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{c.name ?? "—"}</span>
                  <span className="block text-xs text-muted">
                    {c.count.toLocaleString("en")} kanji
                    {c.radicalNumber !== null && ` · rad. ${c.radicalNumber}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-auto block rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
        >
          Show more ({(results.length - shown).toLocaleString("en")} left)
        </button>
      )}
    </div>
  );
}
