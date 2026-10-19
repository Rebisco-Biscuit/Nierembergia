import Link from "next/link";
import { kanjiHref } from "@/lib/format";
import type { Kanji } from "@/lib/types";

/** A compact link to a kanji: the character with its first meaning. */
export function KanjiTile({ kanji }: { kanji: Kanji }) {
  return (
    <Link
      href={kanjiHref(kanji.character)}
      title={kanji.meanings.slice(0, 3).join(", ")}
      className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-1 py-2 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span lang="ja" className="font-serif text-3xl leading-none">
        {kanji.character}
      </span>
      <span className="w-full truncate text-center text-xs text-muted">
        {kanji.meanings[0] ?? "—"}
      </span>
    </Link>
  );
}
