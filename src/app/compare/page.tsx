import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompareForm } from "@/components/CompareForm";
import { Glyph } from "@/components/Decomposition";
import { KanjiNoteSnippet } from "@/components/KanjiNoteSnippet";
import { ReadingList, Romaji } from "@/components/Romaji";
import { compareHref, compareKanji, parseCompareParam } from "@/lib/compare";
import { getKanjiDetail, getKanjiTree, type KanjiDetail } from "@/lib/data";
import { componentHref, gradeLabel, kanjiHref } from "@/lib/format";
import { displayReading } from "@/lib/study";

export const metadata: Metadata = {
  title: "Compare kanji — Nierembergia",
  description: "Put look-alike kanji side by side: shared parts, differences, meanings, and readings.",
};

const EXAMPLES = ["未末", "待持特侍", "鳥馬", "右石", "清晴精"];

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Compare kanji</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Put two to four kanji side by side to see what they share and what tells them apart.
      </p>
      <Suspense fallback={<div className="h-12" />}>
        <CompareForm />
      </Suspense>
      <Suspense fallback={<div className="mt-8 h-80 animate-pulse rounded-2xl border border-border bg-surface" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/compare">, "searchParams">) {
  const chars = parseCompareParam((await searchParams).k);
  const details = chars.map((c) => ({ c, detail: getKanjiDetail(c) }));
  const unknown = details.filter((d) => !d.detail).map((d) => d.c);
  const found = details.flatMap((d) => (d.detail ? [d.detail] : []));

  if (found.length < 2) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-10 text-center">
        {unknown.length > 0 && (
          <p className="mb-2 text-sm text-danger">
            Not in the dataset: <span lang="ja">{unknown.join(" ")}</span>
          </p>
        )}
        <p className="font-medium">Add at least two kanji to compare.</p>
        <p className="mt-2 text-sm text-muted">Try a pair that&apos;s easy to mix up:</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <li key={e}>
              <Link href={compareHref([...e])} lang="ja" className="rounded-full border border-border px-3 py-1 font-serif text-lg hover:border-accent">
                {[...e].join(" / ")}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const comparison = compareKanji(
    found.map((d) => ({
      character: d.kanji.character,
      tree: getKanjiTree(d.kanji.character),
      onyomi: d.kanji.onyomi,
      kunyomi: d.kanji.kunyomi,
    })),
  );

  return (
    <div className="mt-8 space-y-6">
      {unknown.length > 0 && (
        <p className="text-sm text-danger">
          Not in the dataset: <span lang="ja">{unknown.join(" ")}</span>
        </p>
      )}

      <section aria-label="Summary" className="space-y-2 rounded-2xl border border-border bg-surface p-5 text-sm">
        <p>
          <span className="text-muted">Shared parts: </span>
          {comparison.shared.length ? (
            comparison.shared.map((c, i) => (
              <span key={c}>
                {i > 0 && " "}
                <Link href={componentHref(c)} lang="ja" className="font-serif text-lg hover:text-accent">
                  {c}
                </Link>
              </span>
            ))
          ) : (
            <span className="text-muted">none</span>
          )}
        </p>
        <p>
          <span className="text-muted">Told apart by: </span>
          {found.map((d, i) => (
            <span key={d.kanji.character}>
              {i > 0 && <span className="text-muted"> · </span>}
              <span lang="ja" className="font-serif text-lg">
                {d.kanji.character}
              </span>{" "}
              <span lang="ja" className="text-accent">
                {comparison.distinct[d.kanji.character].join(" ") || "—"}
              </span>
            </span>
          ))}
        </p>
        {comparison.sharedReadings.length > 0 && (
          <p>
            <span className="text-muted">Shared readings: </span>
            <ReadingList readings={comparison.sharedReadings} />
            {comparison.shared.length > 0 && (
              <span className="text-muted"> (often a sign of a shared sound component)</span>
            )}
          </p>
        )}
      </section>

      <ul className={`grid gap-4 sm:grid-cols-2 ${found.length >= 3 ? "lg:grid-cols-3" : ""} ${found.length === 4 ? "xl:grid-cols-4" : ""}`}>
        {found.map((d) => (
          <li key={d.kanji.character}>
            <CompareColumn detail={d} distinct={new Set(comparison.distinct[d.kanji.character])} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareColumn({ detail, distinct }: { detail: KanjiDetail; distinct: Set<string> }) {
  const { kanji, radical, strokes, components, vocabulary } = detail;
  // Highlight the strokes of the parts that set this kanji apart.
  const highlight = (components ?? []).filter((c) => c.character && distinct.has(c.character)).flatMap((c) => c.strokes);
  const grade = gradeLabel(kanji.grade);

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        {strokes ? (
          <Glyph strokes={strokes} highlight={highlight} className="size-24 shrink-0" />
        ) : (
          <span lang="ja" className="font-serif text-7xl leading-none">
            {kanji.character}
          </span>
        )}
        <div className="min-w-0">
          <Link href={kanjiHref(kanji.character)} lang="ja" className="font-serif text-3xl hover:text-accent">
            {kanji.character}
          </Link>
          <p className="font-medium">{kanji.meanings.slice(0, 3).join(", ") || "—"}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted">On</dt>
        <dd>{kanji.onyomi.length ? <ReadingList readings={kanji.onyomi} /> : "—"}</dd>
        <dt className="text-muted">Kun</dt>
        <dd>{kanji.kunyomi.length ? <ReadingList readings={kanji.kunyomi} display={displayReading} /> : "—"}</dd>
        <dt className="text-muted">Strokes</dt>
        <dd>{kanji.strokes}</dd>
        <dt className="text-muted">Radical</dt>
        <dd>
          <span lang="ja">{radical.character}</span> {radical.name}
        </dd>
        <dt className="text-muted">Level</dt>
        <dd>{[kanji.jlpt && `N${kanji.jlpt}`, grade].filter(Boolean).join(" · ") || "—"}</dd>
      </dl>
      <KanjiNoteSnippet character={kanji.character} />
      {vocabulary.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-3 text-sm">
          {vocabulary.slice(0, 3).map((w) => (
            <li key={w.word}>
              <span lang="ja" className="text-base">
                {w.word}
              </span>{" "}
              <span className="text-muted">
                <span lang="ja">{w.reading}</span> <Romaji reading={w.reading} />
              </span>{" "}
              <span className="text-muted">· {w.meanings[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
