import { describe, expect, it } from "vitest";
import { clampTarget, emptyProgress, parseProgress, recordAnswer, type Progress } from "./progress";
import { targetStreak, todayTargets } from "./targets";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();
const day = (d: number) => `2026-11-${String(d).padStart(2, "0")}`;

function withDays(days: Record<number, [answers: number, learned: number]>, targets = { answers: 10, newKanji: 2 }): Progress {
  const p = { ...emptyProgress(), targets };
  for (const [d, [answers, learned]] of Object.entries(days)) {
    p.daily[day(Number(d))] = { answers, correct: answers, learned, ms: 0 };
  }
  return p;
}

describe("todayTargets", () => {
  it("reports today's answers and new kanji against the targets", () => {
    const t = todayTargets(withDays({ 3: [4, 2] }), at(3));
    expect(t.answers).toEqual({ goal: 10, done: 4, met: false, fraction: 0.4 });
    expect(t.newKanji).toMatchObject({ done: 2, met: true, fraction: 1 });
    expect(t.met).toBe(false);
  });

  it("counts live answers", () => {
    let p = { ...emptyProgress(), targets: { answers: 2, newKanji: 1 } };
    p = recordAnswer(recordAnswer(p, "水", true, at(3, 9)), "水", false, at(3, 10));
    expect(todayTargets(p, at(3, 11)).met).toBe(true);
  });

  it("ignores targets that are turned off", () => {
    const t = todayTargets(withDays({ 3: [12, 0] }, { answers: 10, newKanji: 0 }), at(3));
    expect(t.met).toBe(true);
    expect(todayTargets(withDays({ 3: [12, 0] }, { answers: 0, newKanji: 0 }), at(3))).toMatchObject({
      anySet: false,
      met: false,
    });
  });
});

describe("targetStreak", () => {
  it("counts met days ending today", () => {
    expect(targetStreak(withDays({ 1: [10, 2], 2: [15, 3], 3: [10, 2] }), at(3))).toBe(3);
  });

  it("stays alive while today is still to do, and breaks on a missed day", () => {
    expect(targetStreak(withDays({ 1: [10, 2], 2: [10, 2], 3: [3, 0] }), at(3))).toBe(2);
    expect(targetStreak(withDays({ 1: [10, 2], 2: [9, 2] }), at(3))).toBe(0);
  });
});

describe("saved targets", () => {
  it("default, round-trip, and clamp", () => {
    expect(emptyProgress().targets).toEqual({ answers: 20, newKanji: 5 });
    const p = { ...emptyProgress(), targets: { answers: 35, newKanji: 0 } };
    expect(parseProgress(JSON.stringify(p)).targets).toEqual({ answers: 35, newKanji: 0 });
    expect(parseProgress(JSON.stringify({ ...p, targets: { answers: 9999, newKanji: -3 } })).targets).toEqual({
      answers: 500,
      newKanji: 0,
    });
    expect(clampTarget(Number.NaN)).toBe(0);
  });
});
