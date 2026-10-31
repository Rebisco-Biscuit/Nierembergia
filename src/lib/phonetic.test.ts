import { describe, expect, it } from "vitest";
import { compareReadings, devoice } from "./phonetic";

describe("devoice", () => {
  it("drops voicing marks", () => {
    expect(devoice("ジュウ")).toBe("シュウ");
    expect(devoice("バイ")).toBe("ハイ");
    expect(devoice("パン")).toBe("ハン");
    expect(devoice("セイ")).toBe("セイ");
  });
});

describe("compareReadings", () => {
  it("finds a shared reading", () => {
    expect(compareReadings("吾", ["ゴ"], ["ゴ"])).toMatchObject({ match: "same", shared: ["ゴ"] });
    expect(compareReadings("青", ["セイ", "ショウ"], ["セイ", "ショウ"])?.shared).toEqual(["セイ", "ショウ"]);
  });

  it("treats voicing and a shared first sound as close", () => {
    expect(compareReadings("主", ["シュ", "ス", "シュウ"], ["ジュウ", "チュウ"])).toMatchObject({
      match: "close",
      shared: ["ジュウ"],
    });
    expect(compareReadings("直", ["チョク", "ジキ"], ["チ"])?.match).toBe("close");
  });

  it("says when readings have drifted apart", () => {
    expect(compareReadings("反", ["ハン", "ホン"], ["カ", "ケ"])).toMatchObject({ match: "drifted", shared: [] });
  });

  it("has nothing to say without readings on both sides", () => {
    expect(compareReadings("⺌", [], ["ショウ"])).toBeNull();
    expect(compareReadings("吾", ["ゴ"], [])).toBeNull();
  });
});
