import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";

describe("parseSearchParams", () => {
  it("defaults to an empty query on page 1", () => {
    expect(parseSearchParams({})).toEqual({
      q: "",
      filters: { minStrokes: undefined, maxStrokes: undefined },
      page: 1,
    });
  });

  it("parses every filter", () => {
    const parsed = parseSearchParams({
      q: "水",
      jlpt: "5,4",
      grade: "9,10",
      min: "3",
      max: "8",
      page: "2",
    });
    expect(parsed).toEqual({
      q: "水",
      filters: { jlpt: [5, 4], grades: [9, 10], minStrokes: 3, maxStrokes: 8 },
      page: 2,
    });
  });

  it("ignores invalid and out-of-range values", () => {
    const parsed = parseSearchParams({ jlpt: "0,6,x,3", min: "-1", max: "abc", page: "0" });
    expect(parsed.filters).toEqual({ jlpt: [3], minStrokes: undefined, maxStrokes: undefined });
    expect(parsed.page).toBe(1);
  });

  it("takes the first value of repeated params", () => {
    expect(parseSearchParams({ q: ["a", "b"] }).q).toBe("a");
  });
});
