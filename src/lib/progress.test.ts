import { describe, expect, it } from "vitest";
import {
  dayKey,
  dayStreak,
  emptyProgress,
  parseProgress,
  recordAnswer,
  recordSession,
  summarize,
  type SessionRecord,
} from "./progress";

// Local-time timestamps, so day boundaries match dayKey in any time zone.
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const session = (day: number, hour = 12): SessionRecord => ({ at: at(day, hour), mode: "quiz", total: 10, correct: 7 });

describe("recordAnswer", () => {
  it("counts answers and tracks the current streak", () => {
    let p = emptyProgress();
    p = recordAnswer(p, "水", true, 1);
    p = recordAnswer(p, "水", true, 2);
    expect(p.kanji["水"]).toEqual({ seen: 2, correct: 2, streak: 2, lastSeen: 2 });
    p = recordAnswer(p, "水", false, 3);
    expect(p.kanji["水"]).toEqual({ seen: 3, correct: 2, streak: 0, lastSeen: 3 });
  });

  it("does not mutate the previous state", () => {
    const before = emptyProgress();
    recordAnswer(before, "水", true, 1);
    expect(before.kanji).toEqual({});
  });
});

describe("recordSession", () => {
  it("keeps only the most recent 200 sessions", () => {
    let p = emptyProgress();
    for (let i = 0; i < 205; i++) p = recordSession(p, { at: i, mode: "quiz", total: 1, correct: 1 });
    expect(p.sessions).toHaveLength(200);
    expect(p.sessions[0].at).toBe(5);
  });
});

describe("dayKey", () => {
  it("formats a local calendar day", () => {
    expect(dayKey(at(3, 0))).toBe("2026-10-03");
    expect(dayKey(at(3, 23))).toBe("2026-10-03");
  });
});

describe("dayStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(dayStreak([session(20), session(21), session(22, 8), session(22, 20)], at(22))).toBe(3);
  });

  it("stays alive if the last session was yesterday", () => {
    expect(dayStreak([session(20), session(21)], at(22))).toBe(2);
  });

  it("breaks after a missed day", () => {
    expect(dayStreak([session(18), session(19)], at(22))).toBe(0);
    expect(dayStreak([session(18), session(20), session(21), session(22)], at(22))).toBe(3);
  });

  it("is zero with no sessions", () => {
    expect(dayStreak([], at(22))).toBe(0);
  });
});

describe("summarize", () => {
  let p = emptyProgress();
  // 水: right three times (mastered). 火: right, then wrong (weak). 木: wrong twice (weak, worse).
  for (let i = 0; i < 3; i++) p = recordAnswer(p, "水", true, 10 + i);
  p = recordAnswer(p, "火", true, 20);
  p = recordAnswer(p, "火", false, 21);
  p = recordAnswer(p, "木", false, 5);
  p = recordAnswer(p, "木", false, 6);
  p = recordSession(p, session(22));

  const s = summarize(p, at(22));

  it("counts studied kanji, answers, and accuracy", () => {
    expect(s.studied).toBe(3);
    expect(s.answers).toBe(7);
    expect(s.accuracy).toBeCloseTo(4 / 7);
  });

  it("counts mastered kanji", () => {
    expect(s.mastered).toBe(1);
  });

  it("lists weak kanji, worst first", () => {
    expect(s.weak).toEqual(["木", "火"]);
  });

  it("reports the day streak and session count", () => {
    expect(s.dayStreak).toBe(1);
    expect(s.sessions).toBe(1);
  });

  it("has no accuracy before any answers", () => {
    expect(summarize(emptyProgress(), at(22)).accuracy).toBeNull();
  });
});

describe("parseProgress", () => {
  it("round-trips saved progress", () => {
    const p = recordSession(recordAnswer(emptyProgress(), "水", true, 1), session(22));
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });

  it("starts fresh on missing, corrupt, or unknown-version data", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("nope")).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: 2, kanji: {} }))).toEqual(emptyProgress());
  });

  it("drops impossible or malformed entries", () => {
    const parsed = parseProgress(
      JSON.stringify({
        version: 1,
        kanji: {
          水: { seen: 2, correct: 1, streak: 1, lastSeen: 5 },
          火: { seen: 1, correct: 2, streak: 0, lastSeen: 5 }, // more correct than seen
          木: { seen: -1, correct: 0, streak: 0, lastSeen: 5 },
          金: "junk",
        },
        sessions: [
          { at: 1, mode: "quiz", total: 5, correct: 3 },
          { at: 2, mode: "exam", total: 5, correct: 3 },
          { at: 3, mode: "flashcards", total: 2, correct: 5 },
        ],
      }),
    );
    expect(Object.keys(parsed.kanji)).toEqual(["水"]);
    expect(parsed.sessions).toEqual([{ at: 1, mode: "quiz", total: 5, correct: 3 }]);
  });
});
