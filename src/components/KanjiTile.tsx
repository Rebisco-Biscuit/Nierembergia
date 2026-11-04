import Link from "next/link";
import { kanjiHref, previewReading } from "@/lib/format";
import type { Kanji } from "@/lib/types";
import { Romaji } from "./Romaji";

/**
 * A compact link to a kanji: the character, its first meaning, and its main
 * reading with romaji. Pass `reading` when `kanji` doesn't carry its readings.
 */
export function KanjiTile({
  kanji,
  reading = previewReading(kanji),
}: {
  kanji: Pick<Kanji, "character" | "meanings"> & Partial<Pick<Kanji, "onyomi" | "kunyomi">>;
  reading?: string | null;
}) {
  return (
    <Link
      href={kanjiHref(kanji.character)}
      title={kanji.meanings.slice(0, 3).join(", ")}
      className="flex h-full w-20 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-1 py-2 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span lang="ja" className="font-serif text-3xl leading-none">
        {kanji.character}
      </span>
      <span className="w-full truncate text-center text-xs text-muted">
        {kanji.meanings[0] ?? "—"}
      </span>
      {reading && (
        <span className="flex w-full flex-col text-center text-xs leading-tight">
          <span lang="ja" className="truncate">
            {reading}
          </span>
          <Romaji reading={reading} className="truncate" />
        </span>
      )}
    </Link>
  );
}
