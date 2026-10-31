import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComponentKanjiList } from "@/components/ComponentKanjiList";
import { SoundFamily } from "@/components/SoundFamily";
import { componentIndex, getComponentDetail } from "@/lib/data";
import { componentHref, decodeParam, kanjiHref } from "@/lib/format";

export function generateStaticParams() {
  return [...componentIndex.keys()].map((character) => ({ character }));
}

export async function generateMetadata({
  params,
}: PageProps<"/component/[character]">): Promise<Metadata> {
  const detail = getComponentDetail(decodeParam((await params).character));
  if (!detail) return { title: "Component not found — Nierembergia" };
  return {
    title: `Kanji containing ${detail.character}${detail.name ? ` (${detail.name})` : ""} | Nierembergia`,
    description: `${detail.usedIn.length} kanji built with the component ${detail.character}.`,
  };
}

export default async function ComponentPage({ params }: PageProps<"/component/[character]">) {
  const detail = getComponentDetail(decodeParam((await params).character));
  if (!detail) notFound();
  const { character, name, asKanji, radical, otherForms, usedIn, soundFamily } = detail;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-muted hover:text-foreground">
          ← Search
        </Link>
      </nav>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div
          lang="ja"
          className="flex size-32 shrink-0 items-center justify-center self-center rounded-2xl border border-border bg-surface font-serif text-8xl leading-none sm:self-auto"
        >
          {character}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted">Component</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span lang="ja" className="sr-only">
              {character}:{" "}
            </span>
            {name ?? <span className="text-muted italic">Unnamed component</span>}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <li>
              In <strong>{usedIn.length.toLocaleString("en")}</strong> kanji
            </li>
            {radical && (
              <li>
                <Link href={`/?q=r:${radical.number}`} className="hover:text-accent">
                  Radical no. {radical.number} ({radical.name})
                </Link>
              </li>
            )}
            {soundFamily.length > 0 && (
              <li>
                <a href="#sound-family" className="hover:text-accent">
                  Sound component of <strong>{soundFamily.length.toLocaleString("en")}</strong>
                </a>
              </li>
            )}
            {asKanji && (
              <li>
                <Link href={kanjiHref(character)} className="text-accent hover:underline">
                  <span lang="ja">{character}</span> as a kanji →
                </Link>
              </li>
            )}
          </ul>
          {otherForms.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              Other forms:{" "}
              {otherForms.map((f, i) => (
                <span key={f}>
                  {i > 0 && " · "}
                  <Link href={componentHref(f)} lang="ja" className="font-serif text-base text-accent hover:underline">
                    {f}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      <section aria-labelledby="used-in" className="mt-10">
        <h2 id="used-in" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Kanji containing <span lang="ja">{character}</span>
        </h2>
        <ComponentKanjiList character={character} uses={detail.uses} />
      </section>

      {soundFamily.length > 0 && (
        <section aria-labelledby="sound-family" className="mt-10">
          <h2 id="sound-family" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            As a sound component
          </h2>
          <SoundFamily character={character} asKanji={asKanji} members={soundFamily} />
        </section>
      )}
    </main>
  );
}
