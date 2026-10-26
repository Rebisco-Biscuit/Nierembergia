import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Decomposition } from "@/components/Decomposition";
import { KanjiTile } from "@/components/KanjiTile";
import { KanjiProgress } from "@/components/KanjiProgress";
import { LibraryControls } from "@/components/LibraryControls";
import { StrokeAnimation, StrokeFrames } from "@/components/StrokeOrder";
import { dataset, getKanjiDetail, type KanjiDetail } from "@/lib/data";
import { compareHref } from "@/lib/compare";
import { componentHref, decodeParam, gradeLabel, kanjiHref, parseKunReading } from "@/lib/format";

export function generateStaticParams() {
  return dataset.kanji.map((k) => ({ character: k.character }));
}

export async function generateMetadata({
  params,
}: PageProps<"/kanji/[character]">): Promise<Metadata> {
  const detail = getKanjiDetail(decodeParam((await params).character));
  if (!detail) return { title: "Kanji not found — Nierembergia" };
  const { character, meanings } = detail.kanji;
  return {
    title: `${character} — ${meanings.slice(0, 2).join(", ") || "kanji"} | Nierembergia`,
    description: `Meanings, readings, components, stroke order, and example words for ${character}.`,
  };
}

export default async function KanjiPage({ params }: PageProps<"/kanji/[character]">) {
  const detail = getKanjiDetail(decodeParam((await params).character));
  if (!detail) notFound();
  const { kanji, strokes } = detail;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-muted hover:text-foreground">
          ← Search
        </Link>
      </nav>

      <Hero detail={detail} />

      <div className="mt-10">
        <Section title="Components">
          <Decomposition character={kanji.character} components={detail.components} strokes={strokes} />
        </Section>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_auto]">
        <div className="space-y-10">
          <Readings detail={detail} />
          <Vocabulary detail={detail} />
        </div>

        <Section title="Stroke order">
          {strokes ? (
            <div className="space-y-4">
              <StrokeAnimation strokes={strokes} character={kanji.character} />
              {strokes.length !== kanji.strokes && (
                <p className="max-w-56 text-xs text-muted">
                  This diagram shows a {strokes.length}-stroke form; dictionaries count{" "}
                  {kanji.strokes}. The two differ in how a component is written.
                </p>
              )}
            </div>
          ) : (
            <p className="max-w-56 text-sm text-muted">No stroke order diagram is available for this character.</p>
          )}
        </Section>
      </div>

      {strokes && (
        <div className="mt-10">
          <Section title="Stroke by stroke">
            <StrokeFrames strokes={strokes} />
          </Section>
        </div>
      )}

      <RelatedKanji detail={detail} />
    </main>
  );
}

function Hero({ detail }: { detail: KanjiDetail }) {
  const { kanji, radical, traditionalForms } = detail;
  const grade = gradeLabel(kanji.grade);
  const facts = (
    [
      ["Strokes", kanji.strokes],
      [
        "Radical",
        <Link key="radical" href={`/?q=r:${radical.number}`} className="hover:text-accent">
          <span lang="ja" className="font-serif">
            {radical.character}
          </span>{" "}
          {radical.name} <span className="text-muted">(no. {radical.number})</span>
        </Link>,
      ],
      ["JLPT", kanji.jlpt && `N${kanji.jlpt}`],
      ["Grade", grade],
      ["Frequency", kanji.frequency && `#${kanji.frequency} of 2,500`],
    ] satisfies [string, React.ReactNode][]
  ).filter(([, value]) => value !== null);

  return (
    <header className="flex flex-col gap-8 sm:flex-row sm:items-start">
      <div
        lang="ja"
        className="flex size-44 shrink-0 items-center justify-center self-center rounded-2xl border border-border bg-surface font-serif text-[8.5rem] leading-none sm:self-start"
      >
        {kanji.character}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="sr-only">{kanji.character}: </span>
          {kanji.meanings[0] ?? <span className="text-muted italic">No English meaning</span>}
        </h1>
        {kanji.meanings.length > 1 && (
          <p className="mt-1 text-lg text-muted">{kanji.meanings.slice(1).join(", ")}</p>
        )}
        {kanji.variantOf && (
          <p className="mt-2 text-sm">
            Traditional form of{" "}
            <Link href={kanjiHref(kanji.variantOf)} lang="ja" className="font-serif text-accent hover:underline">
              {kanji.variantOf}
            </Link>
          </p>
        )}
        {traditionalForms.length > 0 && (
          <p className="mt-2 text-sm">
            Traditional form:{" "}
            {traditionalForms.map((t) => (
              <Link key={t.character} href={kanjiHref(t.character)} lang="ja" className="font-serif text-accent hover:underline">
                {t.character}
              </Link>
            ))}
          </p>
        )}
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <LibraryControls character={kanji.character} />
        <KanjiProgress character={kanji.character} />
      </div>
    </header>
  );
}

function Readings({ detail }: { detail: KanjiDetail }) {
  const { onyomi, kunyomi } = detail.kanji;
  if (!onyomi.length && !kunyomi.length) return null;
  return (
    <Section title="Readings">
      <dl className="space-y-4">
        {onyomi.length > 0 && (
          <div>
            <dt className="text-sm text-muted">
              On&apos;yomi <span lang="ja">音読み</span>
              <span className="ml-2 text-xs">Sino-Japanese, mostly in compounds</span>
            </dt>
            <dd lang="ja" className="mt-1 flex flex-wrap gap-2 text-xl">
              {onyomi.map((r) => (
                <span key={r} className="rounded-lg bg-accent-soft px-2.5 py-0.5">
                  {r}
                </span>
              ))}
            </dd>
          </div>
        )}
        {kunyomi.length > 0 && (
          <div>
            <dt className="text-sm text-muted">
              Kun&apos;yomi <span lang="ja">訓読み</span>
              <span className="ml-2 text-xs">native Japanese, often on its own</span>
            </dt>
            <dd lang="ja" className="mt-1 flex flex-wrap gap-2 text-xl">
              {kunyomi.map((r) => {
                const { stem, okurigana, isPrefix, isSuffix } = parseKunReading(r);
                return (
                  <span key={r} className="rounded-lg border border-border px-2.5 py-0.5">
                    {isSuffix && <span className="text-muted">～</span>}
                    {stem}
                    {okurigana && <span className="text-muted">{okurigana}</span>}
                    {isPrefix && <span className="text-muted">～</span>}
                  </span>
                );
              })}
            </dd>
            {kunyomi.some((r) => r.includes(".")) && (
              <p className="mt-2 text-xs text-muted">Grey kana are okurigana, written after the kanji.</p>
            )}
          </div>
        )}
      </dl>
    </Section>
  );
}

function Vocabulary({ detail }: { detail: KanjiDetail }) {
  const { vocabulary, kanji } = detail;
  return (
    <Section title="Example words">
      {vocabulary.length === 0 ? (
        <p className="text-sm text-muted">No common words using this kanji were found.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {vocabulary.map((w) => (
            <li key={w.word} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
              <span lang="ja" className="text-xl">
                {[...w.word].map((c, i) =>
                  c === kanji.character ? (
                    <span key={i} className="text-accent">
                      {c}
                    </span>
                  ) : (
                    c
                  ),
                )}
              </span>
              <span lang="ja" className="text-sm text-muted">
                {w.reading}
              </span>
              <span className="basis-full text-sm sm:basis-auto">{w.meanings.join("; ")}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function RelatedKanji({ detail }: { detail: KanjiDetail }) {
  const { related, usedIn, kanji, similar } = detail;
  if (related.length === 0 && usedIn.total === 0 && similar.length === 0) return null;

  return (
    <div className="mt-10 space-y-10">
      {similar.length > 0 && (
        <Section title="Look-alikes">
          <p className="mb-2 flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
            <span>Kanji built from mostly the same parts, with a similar stroke count. Computed, not curated.</span>
            <Link
              href={compareHref([kanji.character, ...similar.slice(0, 3).map((k) => k.character)])}
              className="text-accent hover:underline"
            >
              Compare →
            </Link>
          </p>
          <TileList kanji={similar} />
        </Section>
      )}
      {related.length > 0 && (
        <Section title="Shares components">
          <div className="space-y-6">
            {related.map((group) => (
              <div key={group.component}>
                <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span>
                    Also contains{" "}
                    <Link href={componentHref(group.component)} lang="ja" className="font-serif text-xl text-accent hover:underline">
                      {group.component}
                    </Link>
                    {group.name && <span className="text-muted"> ({group.name})</span>}
                  </span>
                  {group.total > group.kanji.length && (
                    <Link href={componentHref(group.component)} className="text-xs text-accent hover:underline">
                      all {group.total.toLocaleString("en")} →
                    </Link>
                  )}
                </h3>
                <TileList kanji={group.kanji} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {usedIn.total > 0 && (
        <Section title="Used as a component in">
          <p className="mb-2 text-sm text-muted">
            <span lang="ja" className="font-serif text-base text-foreground">
              {kanji.character}
            </span>{" "}
            appears inside {usedIn.total.toLocaleString("en")} other kanji.
            {usedIn.total > usedIn.kanji.length && (
              <>
                {" "}
                <Link href={componentHref(kanji.character)} className="text-accent hover:underline">
                  See all →
                </Link>
              </>
            )}
          </p>
          <TileList kanji={usedIn.kanji} />
        </Section>
      )}
    </div>
  );
}

function TileList({ kanji }: { kanji: KanjiDetail["usedIn"]["kanji"] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {kanji.map((k) => (
        <li key={k.character}>
          <KanjiTile kanji={k} />
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}
