import { describe, expect, it } from "vitest";
import { decodeParam, gradeLabel, kanjiHref, parseKunReading } from "./format";

describe("parseKunReading", () => {
  it("splits okurigana", () => {
    expect(parseKunReading("た.べる")).toEqual({
      stem: "た",
      okurigana: "べる",
      isSuffix: false,
      isPrefix: false,
    });
  });

  it("recognises suffix and prefix forms", () => {
    expect(parseKunReading("-び")).toMatchObject({ stem: "び", isSuffix: true, isPrefix: false });
    expect(parseKunReading("ひと-")).toMatchObject({ stem: "ひと", isSuffix: false, isPrefix: true });
  });

  it("handles a plain reading", () => {
    expect(parseKunReading("みず")).toMatchObject({ stem: "みず", okurigana: "" });
  });
});

describe("gradeLabel", () => {
  it("labels each kind of grade", () => {
    expect(gradeLabel(1)).toBe("Grade 1");
    expect(gradeLabel(8)).toBe("Secondary school (jōyō)");
    expect(gradeLabel(9)).toBe("Jinmeiyō (names)");
    expect(gradeLabel(null)).toBeNull();
  });
});

describe("kanji URLs", () => {
  it("round-trips a character through the URL", () => {
    const href = kanjiHref("水");
    expect(href).toBe("/kanji/%E6%B0%B4");
    expect(decodeParam(href.split("/")[2])).toBe("水");
  });

  it("accepts already-decoded or malformed params", () => {
    expect(decodeParam("水")).toBe("水");
    expect(decodeParam("%E6%B0")).toBe("%E6%B0");
  });
});
