import { describe, expect, it } from "vitest";
import kanjiJson from "@/data/kanji.json";
import strokesJson from "@/data/strokes.json";
import type { Kanji } from "./types";

const kanji = kanjiJson as Kanji[];
const strokes = strokesJson as Record<string, string[]>;

describe("generated stroke data", () => {
  it("covers every jōyō kanji", () => {
    const missing = kanji
      .filter((k) => k.grade !== null && k.grade <= 8 && !strokes[k.character])
      .map((k) => k.character);
    expect(missing).toEqual([]);
  });

  it("has stroke paths that start with a move command", () => {
    for (const [char, paths] of Object.entries(strokes)) {
      expect(paths.length, char).toBeGreaterThan(0);
      for (const d of paths) expect(d, char).toMatch(/^[Mm]\s*-?\d/);
    }
  });

  it("matches the dictionary stroke count for nearly all kanji", () => {
    const withStrokes = kanji.filter((k) => strokes[k.character]);
    const mismatched = withStrokes.filter((k) => strokes[k.character].length !== k.strokes);
    // KanjiVG draws some jinmeiyō kanji in their traditional form (e.g. 辻 with
    // a two-dot shinnyō), so a small number legitimately differ.
    expect(mismatched.length / withStrokes.length).toBeLessThan(0.02);
    expect(strokes["水"]).toHaveLength(4);
    expect(strokes["書"]).toHaveLength(10);
  });
});
