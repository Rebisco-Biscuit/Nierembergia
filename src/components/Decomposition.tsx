import { positionLabel, type DecomposedComponent, type Role } from "@/lib/decomposition";

// KanjiVG draws on a 109×109 canvas.
const VIEWBOX = "0 0 109 109";
const COMPONENT_COLORS = ["var(--comp-1)", "var(--comp-2)", "var(--comp-3)", "var(--comp-4)"];
const MAX_DEPTH = 3;

const colorFor = (index: number) => COMPONENT_COLORS[index % COMPONENT_COLORS.length];

/** The kanji with `highlight` strokes in colour and the rest faint. */
function Glyph({
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

function ComponentCard({
  component,
  strokes,
  color,
  depth,
}: {
  component: DecomposedComponent;
  strokes: string[];
  color: string;
  depth: number;
}) {
  const { character, name, radicalNumber, roles, children } = component;
  const position = positionLabel(component.position);
  const notes = roles.filter((r) => r.note).map((r) => r.note);
  const nested = depth < MAX_DEPTH ? children : [];

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
              {character ?? <span className="font-sans text-sm text-muted">(unnamed group)</span>}
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
          </ul>
          {notes.map((note) => (
            <p key={note} className="mt-1 text-xs text-muted">
              {note}
            </p>
          ))}
        </div>
      </div>
      {nested.length > 0 && (
        <ul className="ml-6 mt-2 space-y-2 border-l border-border pl-3">
          {nested.map((child, i) => (
            <ComponentCard key={i} component={child} strokes={strokes} color={color} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
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
              <span style={{ color: colorFor(i) }}>{c.character ?? "□"}</span>
            </span>
          ))}
          <span className="font-sans text-xl text-muted">=</span>
          <span>{character}</span>
        </p>
      </div>

      <ul className="space-y-3">
        {components.map((c, i) => (
          <ComponentCard key={i} component={c} strokes={strokes} color={colorFor(i)} depth={1} />
        ))}
      </ul>

      <p className="text-xs text-muted">
        Components and sound marks from KanjiVG; the radical is the kanji&apos;s dictionary
        radical (KANJIDIC2). Roles with a <span aria-hidden>?</span>
        <span className="sr-only">question mark</span> are inferred, not stated by a source, and
        describe how the character is built rather than its full etymology.
      </p>
    </div>
  );
}
