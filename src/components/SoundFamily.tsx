import Link from "next/link";
import { compareHref } from "@/lib/compare";
import type { SoundFamilyMember } from "@/lib/data";
import { kanjiHref } from "@/lib/format";
import { SOUND_MATCH_LABELS, type SoundMatch } from "@/lib/phonetic";
import type { Kanji } from "@/lib/types";
import { ReadingList } from "./Romaji";

const GROUPS: { match: SoundMatch | null; label: string }[] = [
  { match: "same", label: SOUND_MATCH_LABELS.same },
  { match: "close", label: SOUND_MATCH_LABELS.close },
  { match: "drifted", label: SOUND_MATCH_LABELS.drifted },
  { match: null, label: "No reading to compare" },
];

function MemberTile({ member }: { member: SoundFamilyMember }) {
  const { kanji, shared, inferred } = member;
  const reading = shared[0] ?? kanji.onyomi[0];
  return (
    <li>
      <Link
        href={kanjiHref(kanji.character)}
        title={`${kanji.meanings.slice(0, 3).join(", ")}${inferred ? " (sound role inferred)" : ""}`}
        className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-1 py-2 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span lang="ja" className="font-serif text-3xl leading-none">
          {kanji.character}
          {inferred && (
            <sup aria-hidden className="font-sans text-xs text-muted">
              ?
            </sup>
          )}
        </span>
        <span lang="ja" className="w-full truncate text-center text-xs">
          {reading ?? "—"}
        </span>
        {inferred && <span className="sr-only">(sound role inferred)</span>}
      </Link>
    </li>
  );
}

/** The kanji that use a component for its sound, grouped by how well the readings match. */
export function SoundFamily({
  character,
  asKanji,
  members,
}: {
  character: string;
  asKanji: Kanji | null;
  members: SoundFamilyMember[];
}) {
  const sharing = members.filter((m) => m.match === "same" || m.match === "close").length;
  const compared = [...(asKanji ? [character] : []), ...members.map((m) => m.kanji.character)].slice(0, 4);
  return (
    <div className="space-y-5">
      <p className="text-sm">
        <span lang="ja">{character}</span> is the sound component of{" "}
        <strong>{members.length.toLocaleString("en")}</strong> kanji
        {asKanji && asKanji.onyomi.length > 0 && (
          <>
            {" "}
            and is itself read <ReadingList readings={asKanji.onyomi} />. {sharing.toLocaleString("en")} of them
            share or nearly share a reading with it
          </>
        )}
        .
      </p>
      {GROUPS.map(({ match, label }) => {
        const group = members.filter((m) => m.match === match);
        if (group.length === 0) return null;
        return (
          <div key={label}>
            <h3 className="mb-2 text-sm font-medium">
              {label} <span className="text-muted">({group.length})</span>
            </h3>
            <ul className="flex flex-wrap gap-2">
              {group.map((m) => (
                <MemberTile key={m.kanji.character} member={m} />
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Sound components are marked by KanjiVG; those with a <span aria-hidden>?</span>
        <span className="sr-only">question mark</span> are inferred by Nierembergia because an unmarked part is
        read exactly like the kanji. Readings (on&apos;yomi) from KANJIDIC2.
      </p>
      {compared.length > 1 && (
        <Link href={compareHref(compared)} className="inline-block text-sm text-accent hover:underline">
          Compare <span lang="ja">{compared.join("・")}</span> side by side →
        </Link>
      )}
    </div>
  );
}
