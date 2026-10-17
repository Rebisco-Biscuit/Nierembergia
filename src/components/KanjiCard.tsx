import Link from "next/link";
import { kanjiHref } from "@/lib/format";
import type { Kanji } from "@/lib/types";

export function KanjiCard({ kanji }: { kanji: Kanji }) {
  const { character, meanings, onyomi, kunyomi, strokes, jlpt, grade } = kanji;
  return (
    <Link
      href={kanjiHref(character)}
      className="flex h-full gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div
        lang="ja"
        className="font-serif text-5xl leading-none w-14 shrink-0 text-center pt-1"
      >
        {character}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-medium leading-snug">
          {meanings.length ? meanings.slice(0, 3).join(", ") : (
            <span className="text-muted italic">No English meaning</span>
          )}
        </h3>
        {kanji.variantOf && (
          <p className="text-xs text-muted">
            Traditional form of <span lang="ja">{kanji.variantOf}</span>
          </p>
        )}
        <dl lang="ja" className="text-sm text-muted space-y-0.5">
          {onyomi.length > 0 && (
            <div className="flex gap-2">
              <dt className="sr-only">On&apos;yomi</dt>
              <dd className="truncate">{onyomi.slice(0, 3).join("、")}</dd>
            </div>
          )}
          {kunyomi.length > 0 && (
            <div className="flex gap-2">
              <dt className="sr-only">Kun&apos;yomi</dt>
              <dd className="truncate">{kunyomi.slice(0, 3).join("、")}</dd>
            </div>
          )}
        </dl>
        <ul className="flex flex-wrap gap-1.5 pt-1 text-xs" aria-label="Details">
          {jlpt && <Badge accent>N{jlpt}</Badge>}
          {grade && grade <= 6 && <Badge>Grade {grade}</Badge>}
          {grade === 8 && <Badge>Jōyō</Badge>}
          {grade && grade >= 9 && <Badge>Jinmeiyō</Badge>}
          <Badge>{strokes} strokes</Badge>
        </ul>
      </div>
    </Link>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <li
      className={
        accent
          ? "rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent"
          : "rounded-full border border-border px-2 py-0.5 text-muted"
      }
    >
      {children}
    </li>
  );
}
