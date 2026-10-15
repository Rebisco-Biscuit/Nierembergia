// Builds src/data/kanji.json and src/data/radicals.json from the raw files
// downloaded by fetch-data.mts. See data/SOURCES.md for provenance and licences.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { Kanji, Radical, JlptLevel } from "../src/lib/types.ts";

const ROOT = path.join(import.meta.dirname, "..");
const RAW = path.join(ROOT, "data", "raw");
const OUT = path.join(ROOT, "src", "data");

// Positional and simplified forms that the Kangxi block doesn't cover.
// Keyed by radical number.
const RADICAL_VARIANTS: Record<number, string[]> = {
  9: ["亻"],
  15: ["冫"],
  18: ["刂"],
  26: ["㔾"],
  47: ["巛"],
  58: ["彑"],
  61: ["忄", "㣺"],
  63: ["戶"],
  64: ["扌"],
  66: ["攵"],
  85: ["氵", "氺"],
  86: ["灬"],
  87: ["爫"],
  93: ["牜"],
  94: ["犭"],
  96: ["王"],
  113: ["礻"],
  118: ["⺮"],
  122: ["罒", "⺲"],
  125: ["耂"],
  130: ["⺼"],
  140: ["艹", "⺾"],
  145: ["衤"],
  146: ["覀"],
  149: ["訁"],
  162: ["辶", "⻌"],
  163: ["⻏"],
  167: ["釒"],
  170: ["⻖"],
  174: ["靑"],
  184: ["飠"],
};

// Radicals whose Kangxi form differs from the form used in Japanese
// (the Kangxi form is kept as a variant above).
const JAPANESE_FORMS: Record<number, string> = { 63: "戸", 174: "青" };

type Node =Record<string, unknown>;

const asArray = <T,>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const text = (value: unknown): string =>
  typeof value === "object" && value !== null
    ? String((value as Node)["#text"] ?? "")
    : String(value);

async function buildRadicals(): Promise<Radical[]> {
  const unicode = await readFile(path.join(RAW, "UnicodeData.txt"), "utf8");
  const radicals: Radical[] = [];
  for (const line of unicode.split("\n")) {
    const [code, name, , , , decomposition] = line.split(";");
    const cp = parseInt(code, 16);
    if (!(cp >= 0x2f00 && cp <= 0x2fd5)) continue;
    const number = cp - 0x2f00 + 1;
    const unified = String.fromCodePoint(
      parseInt(decomposition.replace("<compat> ", ""), 16),
    );
    radicals.push({
      number,
      character: JAPANESE_FORMS[number] ?? unified,
      variants: RADICAL_VARIANTS[number] ?? [],
      name: name.replace("KANGXI RADICAL ", "").toLowerCase(),
      strokes: 0, // filled from KANJIDIC2 below
    });
  }
  if (radicals.length !== 214) {
    throw new Error(`Expected 214 radicals, got ${radicals.length}`);
  }
  return radicals;
}

async function buildKanji() {
  const xml = await readFile(path.join(RAW, "kanjidic2.xml"), "utf8");
  const jlptData = JSON.parse(
    await readFile(path.join(RAW, "kanji-data.json"), "utf8"),
  ) as Record<string, { jlpt_new: number | null }>;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    processEntities: false,
    parseTagValue: false,
  });
  const doc = parser.parse(xml) as {
    kanjidic2: { character: Node[] };
  };

  const kanji: Kanji[] = [];
  const strokesByChar = new Map<string, number>();
  for (const entry of doc.kanjidic2.character) {
    const character = text(entry.literal);
    const misc = entry.misc as Node;
    const strokes = Number(asArray(misc.stroke_count as string[])[0]);
    strokesByChar.set(character, strokes);
    const grade = misc.grade ? Number(misc.grade) : null;
    const frequency = misc.freq ? Number(misc.freq) : null;
    const jlptNew = jlptData[character]?.jlpt_new ?? null;
    // Keep the kanji a learner might reasonably look up.
    if (grade === null && frequency === null && jlptNew === null) continue;

    const radical = Number(
      text(
        asArray((entry.radical as Node).rad_value as Node[]).find(
          (r) => r["@rad_type"] === "classical",
        ),
      ),
    );

    const rm = (entry.reading_meaning as Node | undefined)?.rmgroup as
      | Node
      | undefined;
    const readings = asArray(rm?.reading as Node[] | undefined);
    const readingsOf = (type: string) =>
      readings.filter((r) => r["@r_type"] === type).map(text);
    const meanings = asArray(rm?.meaning as unknown[] | undefined)
      .filter((m) => typeof m !== "object" || !(m as Node)["@m_lang"])
      .map(text)
      // Radical info is shown separately, so drop "water radical (no. 85)" etc.
      .filter((m) => !/radical \(no\.?\s*\d+\)/i.test(m));

    kanji.push({
      character,
      meanings,
      onyomi: readingsOf("ja_on"),
      kunyomi: readingsOf("ja_kun"),
      strokes,
      grade,
      jlpt: jlptNew as JlptLevel | null,
      frequency,
      radical,
      variantOf:
        character.normalize("NFC") !== character ? character.normalize("NFC") : null,
    });
  }

  // Most useful first: frequent kanji, then by grade, then stroke count.
  kanji.sort(
    (a, b) =>
      (a.frequency ?? 9999) - (b.frequency ?? 9999) ||
      (a.grade ?? 99) - (b.grade ?? 99) ||
      a.strokes - b.strokes,
  );
  return { kanji, strokesByChar };
}

const radicals = await buildRadicals();
const { kanji, strokesByChar } = await buildKanji();

// Radical stroke counts come from the radical's own KANJIDIC2 entry.
for (const radical of radicals) {
  const strokes = strokesByChar.get(radical.character);
  if (!strokes) throw new Error(`No stroke count for radical ${radical.number}`);
  radical.strokes = strokes;
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "kanji.json"), JSON.stringify(kanji));
await writeFile(path.join(OUT, "radicals.json"), JSON.stringify(radicals));
console.log(`Wrote ${kanji.length} kanji and ${radicals.length} radicals.`);
