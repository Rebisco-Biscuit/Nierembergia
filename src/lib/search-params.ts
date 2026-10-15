import type { SearchFilters } from "./search";
import type { JlptLevel } from "./types";

export const PAGE_SIZE = 60;

/** Grade filter options. Values are comma-separated KANJIDIC2 grade numbers. */
export const GRADE_OPTIONS = [
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3", label: "Grade 3" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "8", label: "Secondary (jōyō)" },
  { value: "9,10", label: "Jinmeiyō (names)" },
] as const;

export interface ParsedSearch {
  q: string;
  filters: SearchFilters;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function intOrUndefined(value: string | undefined, min: number, max: number) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

function intList(value: string | undefined, min: number, max: number): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => intOrUndefined(s.trim(), min, max))
    .filter((n): n is number => n !== undefined);
}

export function parseSearchParams(params: RawParams): ParsedSearch {
  const jlpt = intList(first(params.jlpt), 1, 5) as JlptLevel[];
  const grades = intList(first(params.grade), 1, 10);
  return {
    q: (first(params.q) ?? "").slice(0, 100),
    filters: {
      ...(jlpt.length && { jlpt }),
      ...(grades.length && { grades }),
      minStrokes: intOrUndefined(first(params.min), 1, 99),
      maxStrokes: intOrUndefined(first(params.max), 1, 99),
    },
    page: intOrUndefined(first(params.page), 1, 999) ?? 1,
  };
}
