"use client";

import { useState } from "react";

// KanjiVG draws on a 109×109 canvas.
const VIEWBOX = "0 0 109 109";
const STROKE_SECONDS = 0.55;

/** Where a stroke starts, for placing its number. */
function startPoint(d: string): [number, number] {
  const [x, y] = d.match(/-?\d*\.?\d+/g)!.map(Number);
  return [x, y];
}

function GuideLines() {
  return (
    <g className="stroke-border" strokeWidth={0.5} strokeDasharray="2 2" fill="none">
      <line x1={54.5} y1={0} x2={54.5} y2={109} />
      <line x1={0} y1={54.5} x2={109} y2={54.5} />
    </g>
  );
}

export function StrokeAnimation({ strokes, character }: { strokes: string[]; character: string }) {
  const [run, setRun] = useState(0);
  const total = strokes.length * STROKE_SECONDS;

  return (
    <figure className="flex flex-col items-center gap-3">
      <svg
        key={run}
        viewBox={VIEWBOX}
        role="img"
        aria-label={`Stroke order animation for ${character}, ${strokes.length} strokes`}
        className="stroke-anim size-56 rounded-xl border border-border bg-surface"
      >
        <GuideLines />
        {/* Faint full glyph underneath, so the shape is visible from the start. */}
        <g className="stroke-border" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {strokes.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="stroke-foreground" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {strokes.map((d, i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              style={{ animationDelay: `${i * STROKE_SECONDS}s`, animationDuration: `${STROKE_SECONDS * 0.85}s` }}
            />
          ))}
        </g>
        <g className="fill-accent text-[7px] font-sans" aria-hidden>
          {strokes.map((d, i) => {
            const [x, y] = startPoint(d);
            return (
              <text
                key={i}
                x={x - 5}
                y={y - 2}
                className="stroke-number"
                style={{ animationDelay: `${i * STROKE_SECONDS}s` }}
              >
                {i + 1}
              </text>
            );
          })}
        </g>
      </svg>
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:border-accent hover:text-foreground"
        aria-label={`Replay stroke order animation (${total.toFixed(0)} seconds)`}
      >
        ↻ Replay
      </button>
    </figure>
  );
}

/** One small diagram per stroke, each adding the next stroke in accent colour. */
export function StrokeFrames({ strokes }: { strokes: string[] }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Stroke by stroke">
      {strokes.map((_, frame) => (
        <li key={frame} className="relative">
          <svg viewBox={VIEWBOX} className="size-14 rounded-md border border-border bg-surface" aria-hidden>
            <GuideLines />
            <g fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
              {strokes.slice(0, frame + 1).map((d, i) => (
                <path key={i} d={d} className={i === frame ? "stroke-accent" : "stroke-foreground"} />
              ))}
            </g>
          </svg>
          <span className="absolute left-1 top-0.5 text-[10px] text-muted">{frame + 1}</span>
        </li>
      ))}
    </ol>
  );
}
