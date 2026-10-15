import "server-only";
import kanjiJson from "@/data/kanji.json";
import radicalsJson from "@/data/radicals.json";
import type { Dataset, Kanji, Radical } from "./types";

export const dataset: Dataset = {
  kanji: kanjiJson as Kanji[],
  radicals: radicalsJson as Radical[],
};

export const radicalByNumber = new Map(dataset.radicals.map((r) => [r.number, r]));
