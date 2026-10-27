import { describe, expect, it } from "vitest";
import { START_EASE, dueLabel, isDue, schedule, type Grade, type SrsState } from "./srs";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 25);

/** Applies grades one review after another, each review happening when it's due. */
function run(grades: Grade[]): SrsState[] {
  const states: SrsState[] = [];
  let prev: SrsState | undefined;
  let now = T0;
  for (const g of grades) {
    prev = schedule(prev, g, now);
    states.push(prev);
    now = prev.due;
  }
  return states;
}

describe("schedule", () => {
  it("starts new kanji at one day, or four if easy", () => {
    expect(schedule(undefined, "good", T0)).toEqual({ interval: 1, ease: START_EASE, due: T0 + DAY });
    expect(schedule(undefined, "easy", T0).interval).toBe(4);
    expect(schedule(undefined, "hard", T0).interval).toBe(1);
  });

  it("brings a forgotten kanji back in ten minutes", () => {
    const s = schedule(undefined, "forgot", T0);
    expect(s.interval).toBe(0);
    expect(s.due).toBe(T0 + 10 * 60 * 1000);
  });

  it("grows intervals with repeated good answers", () => {
    const intervals = run(["good", "good", "good", "good"]).map((s) => s.interval);
    expect(intervals).toEqual([1, 3, 8, 20]);
  });

  it("grows faster when easy and slower when hard", () => {
    const good = run(["good", "good", "good"]).at(-1)!.interval;
    const easy = run(["good", "easy", "easy"]).at(-1)!.interval;
    const hard = run(["good", "hard", "hard"]).at(-1)!.interval;
    expect(easy).toBeGreaterThan(good);
    expect(hard).toBeLessThan(good);
  });

  it("always moves forward on a pass", () => {
    for (const g of ["hard", "good", "easy"] as Grade[]) {
      const prev: SrsState = { interval: 1, ease: 1.3, due: T0 };
      expect(schedule(prev, g, T0).interval).toBeGreaterThan(1);
    }
  });

  it("resets after forgetting and lowers ease, but not below 1.3", () => {
    const states = run(["good", "good", "forgot"]);
    expect(states.at(-1)!.interval).toBe(0);
    expect(states.at(-1)!.ease).toBe(2.3);
    let s: SrsState = { interval: 10, ease: 1.35, due: T0 };
    for (let i = 0; i < 5; i++) s = schedule(s, "forgot", T0);
    expect(s.ease).toBe(1.3);
  });

  it("relearns from one day after forgetting", () => {
    const states = run(["good", "good", "forgot", "good"]);
    expect(states.at(-1)!.interval).toBe(1);
  });
});

describe("isDue", () => {
  it("is due once the due time has passed", () => {
    const s = schedule(undefined, "good", T0);
    expect(isDue(s, T0)).toBe(false);
    expect(isDue(s, T0 + DAY)).toBe(true);
    expect(isDue(undefined, T0)).toBe(false);
  });
});

describe("dueLabel", () => {
  it("describes how far away a review is", () => {
    expect(dueLabel(T0 - 1, T0)).toBe("now");
    expect(dueLabel(T0 + 10 * 60 * 1000, T0)).toBe("in 10 min");
    expect(dueLabel(T0 + 5 * 60 * 60 * 1000, T0)).toBe("later today");
    expect(dueLabel(T0 + DAY, T0)).toBe("tomorrow");
    expect(dueLabel(T0 + 8 * DAY, T0)).toBe("in 8 days");
    expect(dueLabel(T0 + 90 * DAY, T0)).toBe("in 3 months");
  });
});
