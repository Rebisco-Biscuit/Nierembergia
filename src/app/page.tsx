import Link from "next/link";
import { Suspense } from "react";
import { KanjiCard } from "@/components/KanjiCard";
import { SearchControls } from "@/components/SearchControls";
import { dataset } from "@/lib/data";
import { search, type SearchResult } from "@/lib/search";
import { PAGE_SIZE, parseSearchParams } from "@/lib/search-params";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nierembergia
          <span className="ml-2 font-normal text-muted">Kanji Explorer</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Search {dataset.kanji.length.toLocaleString("en")} kanji by character, reading
          (kana or romaji), English meaning, or radical.
        </p>
      </header>

      <Suspense fallback={<div className="h-28" />}>
        <SearchControls />
      </Suspense>

      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const { q, filters, page } = parseSearchParams(params);
  const result = search(q, filters, dataset);
  const total = result.kanji.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = result.kanji.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (n > 1) next.set("page", String(n));
    return `/?${next}`;
  };

  return (
    <section aria-labelledby="results-heading" className="mt-8">
      <RadicalMatches result={result} />

      <h2 id="results-heading" aria-live="polite" className="mb-4 text-sm text-muted">
        {total === 0
          ? "No kanji found"
          : `${total.toLocaleString("en")} kanji${q ? ` for “${q}”` : ""}${
              pageCount > 1 ? ` · page ${current} of ${pageCount}` : ""
            }`}
      </h2>

      {total === 0 ? (
        <EmptyState hasQuery={q !== ""} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((k) => (
            <li key={k.character}>
              <KanjiCard kanji={k} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-sm">
          {current > 1 ? (
            <Link href={pageHref(current - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
              ← Previous
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-muted/50">← Previous</span>
          )}
          <span className="text-muted">
            {current} / {pageCount}
          </span>
          {current < pageCount ? (
            <Link href={pageHref(current + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
              Next →
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-muted/50">Next →</span>
          )}
        </nav>
      )}
    </section>
  );
}

function RadicalMatches({ result }: { result: SearchResult }) {
  if (result.radicals.length === 0) return null;
  return (
    <ul className="mb-6 flex flex-wrap gap-2">
      {result.radicals.map((r) => {
        const content = (
          <>
            <span lang="ja" className="font-serif text-2xl leading-none">
              {r.character}
            </span>
            <span>
              <span className="block font-medium">
                Radical {r.number} · {r.name}
              </span>
              <span className="block text-xs text-muted">
                {r.strokes} strokes
                {r.variants.length > 0 && (
                  <>
                    {" · forms "}
                    <span lang="ja">{r.variants.join(" ")}</span>
                  </>
                )}
              </span>
            </span>
          </>
        );
        const className =
          "flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm";
        return (
          <li key={r.number}>
            {result.kind === "radical" ? (
              <div className={className}>{content}</div>
            ) : (
              <Link
                href={`/?q=r:${r.number}`}
                className={`${className} hover:border-accent`}
                title={`Show all kanji under radical ${r.number}`}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-medium">Nothing matched.</p>
      <p className="mt-2 text-sm text-muted">
        {hasQuery
          ? "Try a single kanji (水), a reading (みず or mizu), an English word (water), or a radical number (r:85)."
          : "No kanji match these filters. Try widening the stroke range or clearing a filter."}
      </p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8" aria-busy="true" aria-label="Loading results">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-border" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
