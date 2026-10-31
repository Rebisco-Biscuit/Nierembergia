import Link from "next/link";
import { positionLabel, type DecomposedComponent, type Role } from "@/lib/decomposition";
import { componentHref } from "@/lib/format";
import { SOUND_MATCH_LABELS, type SoundEvidence } from "@/lib/phonetic";
import { Romaji } from "./Romaji";

// KanjiVG draws on a 109×109 canvas.
const VIEWBOX = "0 0 109 109";
const COMPONENT_COLORS = ["var(--comp-1)", "var(--comp-2)", "var(--comp-3)", "var(--comp-4)"];
const MAX_DEPTH = 3;

const colorFor = (index: number) => COMPONENT_COLORS[index % COMPONENT_COLORS.length];

/** The kanji with `highlight` strokes in colour and the rest faint. */
export function Glyph({
  strokes,
  highlight,
  color = "var(--accent)",
  className,
}: {
  strokes: string[];
  highlight: number[];
  color?: string;
  className: string;
}) {
  const on = new Set(highlight);
  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden>
      <g fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        {strokes.map((d, i) => (
          <path key={i} d={d} stroke={on.has(i) ? color : "var(--border)"} />
        ))}
      </g>
    </svg>
  );
}

const ROLE_STYLES: Record<Role["kind"], { label: string; className: string }> = {
  radical: { label: "Radical", className: "bg-accent text-accent-foreground" },
  semantic: { label: "Meaning", className: "border border-accent text-accent" },
  phonetic: { label: "Sound", className: "border border-accent text-accent" },
};

const SOURCE_LABELS: Record<Role["source"], string> = {
  KANJIDIC2: "the kanji's dictionary radical (KANJIDIC2)",
  KanjiVG: "marked by KanjiVG",
  inferred: "inferred by Nierembergia",
};

function RoleBadge({ role }: { role: Role }) {
  const { label, className } = ROLE_STYLES[role.kind];
  const detail = role.note ?? SOURCE_LABELS[role.source];
  return (
    <li className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`} title={detail}>
      {label}
      {role.source === "inferred" && <span aria-hidden>?</span>}
      <span className="sr-only"> ({detail})</span>
    </li>
  );
}

const MATCH_STYLES: Record<SoundEvidence["match"], string> = {
  same: "text-accent",
  close: "text-foreground",
  drifted: "text-muted",
};

function Readings({ readings, highlight }: { readings: string[]; highlight: string[] }) {
  return (
    <>
      {readings.map((r, i) => (
        <span key={r}>
          {i > 0 && "、"}
          <span lang="ja" className={highlight.includes(r) ? "font-semibold text-foreground" : undefined}>
            {r}
          </span>{" "}
          <Romaji reading={r} />
        </span>
      ))}
    </>
  );
}

/** "吾 is read ゴ go; 語 is read ゴ go. Same reading." */
function SoundEvidenceLine({ evidence, kanji }: { evidence: SoundEvidence; kanji: string }) {
  const { component, componentReadings, kanjiReadings, match, shared } = evidence;
  // Highlight the component readings the kanji's shared readings came from.
  const sharedFrom = match === "same" ? shared : [];
  return (
    <p className="mt-1 text-xs text-muted">
      <span lang="ja">{component}</span> is read <Readings readings={componentReadings} highlight={sharedFrom} />;{" "}
      <span lang="ja">{kanji}</span> is read <Readings readings={kanjiReadings} highlight={shared} />.{" "}
      <strong className={`font-medium ${MATCH_STYLES[match]}`}>{SOUND_MATCH_LABELS[match]}.</strong>
      {match === "drifted" && " Sound components hint at old readings, which have since changed."}
    </p>
  );
}

function ComponentCard({
  component,
  kanji,
  strokes,
  color,
  depth,
}: {
  component: DecomposedComponent;
  kanji: string;
  strokes: string[];
  color: string;
  depth: number;
}) {
  const { character, name, radicalNumber, roles, children } = component;
  const position = positionLabel(component.position);
  const notes = roles.filter((r) => r.note).map((r) => r.note);
  const evidence = roles.find((r) => r.evidence)?.evidence;
  const nested = depth < MAX_DEPTH ? children : [];
  const linkable = component.usedInCount > 0;

  return (
    <li>
      <div className="flex gap-3 rounded-xl border border-border bg-surface p-3">
        <Glyph
          strokes={strokes}
          highlight={component.strokes}
          color={color}
          className={depth === 1 ? "size-16 shrink-0" : "size-11 shrink-0"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span lang="ja" className={`font-serif leading-none ${depth === 1 ? "text-3xl" : "text-2xl"}`}>
              {character && linkable ? (
                <Link
                  href={componentHref(character)}
                  className="hover:text-accent"
                  aria-label={`${character}: see the kanji that contain it`}
                >
                  {character}
                </Link>
              ) : (
                (character ?? <span className="font-sans text-sm text-muted">(unnamed group)</span>)
              )}
            </span>
            {name && <span className="font-medium">{name}</span>}
          </div>
          <ul className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Details">
            {roles.map((r) => (
              <RoleBadge key={r.kind} role={r} />
            ))}
            <li className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              {radicalNumber ? `Radical no. ${radicalNumber}` : "Component"}
            </li>
            {position && <li className="text-xs text-muted">{position}</li>}
            <li className="text-xs text-muted">
              {component.strokes.length} stroke{component.strokes.length === 1 ? "" : "s"}
            </li>
            {character && linkable && (
              <li className="text-xs">
                <Link href={componentHref(character)} className="text-accent hover:underline">
                  in {component.usedInCount.toLocaleString("en")} other kanji →
                </Link>
              </li>
            )}
          </ul>
          {notes.map((note) => (
            <p key={note} className="mt-1 text-xs text-muted">
              {note}
            </p>
          ))}
          {evidence && <SoundEvidenceLine evidence={evidence} kanji={kanji} />}
        </div>
      </div>
      {nested.length > 0 && (
        <ul className="ml-6 mt-2 space-y-2 border-l border-border pl-3">
          {nested.map((child, i) => (
            <ComponentCard key={i} component={child} kanji={kanji} strokes={strokes} color={color} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

const roleOf = (c: DecomposedComponent, kind: Role["kind"]) => c.roles.find((r) => r.kind === kind);

/** "A meaning + sound compound: 言 hints at the meaning, 吾 at the sound." */
function CompoundSummary({ components }: { components: DecomposedComponent[] }) {
  const meaning = components.find((c) => roleOf(c, "semantic"));
  const sound = components.find((c) => roleOf(c, "phonetic"));
  if (!meaning?.character || !sound?.character) return null;
  const guessed = roleOf(sound, "phonetic")!.source === "inferred";
  return (
    <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      {guessed ? "Probably a" : "A"} <strong>meaning + sound</strong> compound:{" "}
      <span lang="ja" className="font-serif text-base">
        {meaning.character}
      </span>{" "}
      hints at the meaning,{" "}
      <span lang="ja" className="font-serif text-base">
        {sound.character}
      </span>{" "}
      at the sound.
    </p>
  );
}

export function Decomposition({
  character,
  components,
  strokes,
}: {
  character: string;
  components: DecomposedComponent[] | null;
  strokes: string[] | null;
}) {
  if (!components || !strokes) {
    return <p className="text-sm text-muted">No component data is available for this character.</p>;
  }
  if (components.length === 0) {
    return (
      <p className="text-sm text-muted">
        <span lang="ja" className="font-serif text-base text-foreground">
          {character}
        </span>{" "}
        is a single component: KanjiVG doesn&apos;t break it down further.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <svg
          viewBox={VIEWBOX}
          role="img"
          aria-label={`${character} built from ${components.map((c) => c.character ?? "an unnamed group").join(" and ")}`}
          className="size-32 shrink-0 rounded-xl border border-border bg-surface"
        >
          <g fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((d, i) => {
              const owner = components.findIndex((c) => c.strokes.includes(i));
              return <path key={i} d={d} stroke={owner >= 0 ? colorFor(owner) : "var(--foreground)"} />;
            })}
          </g>
        </svg>
        <p lang="ja" className="flex flex-wrap items-center gap-2 font-serif text-3xl">
          {components.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="font-sans text-xl text-muted">+</span>}
              {c.character && c.usedInCount > 0 ? (
                <Link href={componentHref(c.character)} style={{ color: colorFor(i) }} className="hover:underline">
                  {c.character}
                </Link>
              ) : (
                <span style={{ color: colorFor(i) }}>{c.character ?? "□"}</span>
              )}
            </span>
          ))}
          <span className="font-sans text-xl text-muted">=</span>
          <span>{character}</span>
        </p>
      </div>

      <CompoundSummary components={components} />

      <ul className="space-y-3">
        {components.map((c, i) => (
          <ComponentCard key={i} component={c} kanji={character} strokes={strokes} color={colorFor(i)} depth={1} />
        ))}
      </ul>

      <p className="text-xs text-muted">
        Components and sound marks from KanjiVG; the radical is the kanji&apos;s dictionary
        radical (KANJIDIC2); readings from KANJIDIC2. Roles with a <span aria-hidden>?</span>
        <span className="sr-only">question mark</span> are inferred, not stated by a source: a sound
        component is inferred when an unmarked part is read exactly like the kanji. They describe how
        the character is built rather than its full etymology.
      </p>
    </div>
  );
}
