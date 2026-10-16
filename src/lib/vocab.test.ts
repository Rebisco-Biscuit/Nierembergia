import { describe, expect, it } from "vitest";
import vocabJson from "@/data/vocab.json";
import { pickExamples, priorityScore, type VocabCandidate, type VocabWord } from "./vocab";

const vocab = vocabJson as Record<string, VocabWord[]>;

const candidate = (word: string, priority: string[]): VocabCandidate => ({
  word,
  reading: "",
  meanings: [],
  priority,
});

describe("priorityScore", () => {
  it("uses the newspaper frequency band when present", () => {
    expect(priorityScore(["ichi1", "news1", "nf06"])).toBe(6);
  });

  it("ranks first-tier lists above second-tier ones", () => {
    expect(priorityScore(["ichi1"])).toBeLessThan(priorityScore(["news2"])!);
  });

  it("returns null for words that aren't marked common", () => {
    expect(priorityScore([])).toBeNull();
  });
});

describe("pickExamples", () => {
  const candidates = [
    candidate("水曜日", ["nf10"]),
    candidate("水", ["nf10"]),
    candidate("水道", ["nf06"]),
    candidate("雨水", []),
    candidate("火", ["nf01"]),
    candidate("水道", ["ichi1"]),
  ];

  it("keeps common words containing the kanji, most frequent first, shorter on ties", () => {
    expect(pickExamples(candidates, "水", 10).map((w) => w.word)).toEqual([
      "水道",
      "水",
      "水曜日",
    ]);
  });

  it("respects the limit", () => {
    expect(pickExamples(candidates, "水", 1)).toHaveLength(1);
  });
});

describe("generated vocabulary", () => {
  it("gives common kanji example words that contain them", () => {
    for (const char of ["水", "日", "食", "学"]) {
      const words = vocab[char];
      expect(words.length, char).toBeGreaterThanOrEqual(3);
      for (const w of words) {
        expect(w.word, char).toContain(char);
        expect(w.reading, w.word).toMatch(/^[぀-ヿー]+$/);
        expect(w.meanings.length, w.word).toBeGreaterThan(0);
      }
    }
  });
});
