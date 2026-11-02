import { describe, expect, it } from "vitest";
import {
  accuracyByKind,
  activityByDay,
  formatDuration,
  hardestKanji,
  jlptBreakdown,
  totalStudyTime,
  weakComponents,
  weakReadings,
  type DashboardKanji,
} from "./dashboard";
import { emptyProgress, recordAnswer, recordSession, type Progress } from "./progress";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();

/** Records answers: [kanji, correct, kind?] in order, one minute apart on Nov 2. */
function answers(list: [string, boolean, string?][], start = emptyProgress()): Progress {
  return list.reduce(
    (p, [k, ok, kind], i) => recordAnswer(p, k, ok, at(2) + i * 60_000, ok ? "good" : "forgot", kind),
    start,
  );
}

const kanji = (character: string, jlpt: DashboardKanji["jlpt"], parts: string[] = []): DashboardKanji => ({
  character,
  meaning: "",
  jlpt,
  readings: [],
  parts,
});

describe("activityByDay", () => {
  it("lists every day ending today, with gaps as zero", () => {
    const p = answers([
      ["水", true],
      ["火", false],
    ]);
    const days = activityByDay(p, 3, at(3));
    expect(days.map((d) => d.day)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(days[1]).toMatchObject({ answers: 2, correct: 1, learned: 2 });
    expect(days[0].answers).toBe(0);
  });

  it("falls back to sessions for days before daily tracking", () => {
    const p: Progress = { ...emptyProgress(), sessions: [{ at: at(1), mode: "quiz", total: 10, correct: 6 }] };
    expect(activityByDay(p, 2, at(2))[0]).toMatchObject({ day: "2026-11-01", answers: 10, correct: 6 });
  });
});

describe("totalStudyTime and formatDuration", () => {
  it("sums session time and formats it", () => {
    const p = recordSession(
      recordSession(emptyProgress(), { at: at(1), mode: "quiz", total: 1, correct: 1, ms: 30 * 60_000 }),
      {
        at: at(2),
        mode: "flashcards",
        total: 1,
        correct: 1,
        ms: 35 * 60_000,
      },
    );
    expect(formatDuration(totalStudyTime(p))).toBe("1 h 5 min");
    expect(formatDuration(12 * 60_000)).toBe("12 min");
    expect(formatDuration(5000)).toBe("under a minute");
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("jlptBreakdown", () => {
  it("counts studied and mastered kanji per level", () => {
    const p = answers([
      ["水", true],
      ["水", true],
      ["水", true],
      ["火", false],
    ]);
    const levels = jlptBreakdown(p, [kanji("水", 5), kanji("火", 5), kanji("木", 5), kanji("語", 4)]);
    expect(levels[0]).toEqual({ level: 5, total: 3, studied: 2, mastered: 1 });
    expect(levels[1]).toEqual({ level: 4, total: 1, studied: 0, mastered: 0 });
  });
});

describe("hardestKanji", () => {
  it("lists kanji with enough answers, lowest accuracy first, skipping perfect ones", () => {
    const p = answers([
      ["水", false],
      ["水", false],
      ["火", true],
      ["火", false],
      ["木", true],
      ["木", true],
      ["金", false],
    ]);
    expect(hardestKanji(p, 5).map((k) => k.character)).toEqual(["水", "火"]);
  });
});

describe("accuracyByKind and weakReadings", () => {
  const p = answers([
    ["水", false, "reading"],
    ["水", false, "reading"],
    ["水", true, "meaning"],
    ["火", true, "reading"],
    ["火", false, "reading"],
  ]);

  it("pools answers by question kind", () => {
    expect(accuracyByKind(p)).toEqual({ reading: { seen: 4, correct: 1 }, meaning: { seen: 1, correct: 1 } });
  });

  it("lists kanji whose readings are missed more often than not", () => {
    expect(weakReadings(p, 5)).toEqual([{ character: "水", seen: 2, accuracy: 0 }]);
  });
});

describe("weakComponents", () => {
  it("pools answers over the kanji sharing a component", () => {
    const p = answers([
      ["清", false],
      ["清", false],
      ["晴", false],
      ["晴", true],
      ["林", true],
      ["林", true],
      ["村", true],
      ["村", true],
    ]);
    const list = [
      kanji("清", 4, ["氵", "青"]),
      kanji("晴", 4, ["日", "青"]),
      kanji("林", 5, ["木", "木"]),
      kanji("村", 4, ["木", "寸"]),
    ];
    expect(weakComponents(p, list, 5)).toEqual([
      { component: "青", seen: 4, correct: 1, accuracy: 0.25, kanji: ["清", "晴"] },
    ]);
  });
});
