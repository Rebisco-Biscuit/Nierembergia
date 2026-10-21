import { describe, expect, it } from "vitest";
import {
  addToCollection,
  cleanName,
  collectionsContaining,
  createCollection,
  deleteCollection,
  emptyLibrary,
  isBookmarked,
  parseLibrary,
  removeFromCollection,
  renameCollection,
  toggleBookmark,
  toggleInCollection,
} from "./library";

describe("bookmarks", () => {
  it("toggles a bookmark on and off, newest first", () => {
    let lib = toggleBookmark(emptyLibrary(), "水");
    lib = toggleBookmark(lib, "火");
    expect(lib.bookmarks).toEqual(["火", "水"]);
    expect(isBookmarked(lib, "水")).toBe(true);
    lib = toggleBookmark(lib, "水");
    expect(lib.bookmarks).toEqual(["火"]);
  });

  it("does not mutate the previous state", () => {
    const before = emptyLibrary();
    toggleBookmark(before, "水");
    expect(before.bookmarks).toEqual([]);
  });
});

describe("collections", () => {
  const base = createCollection(emptyLibrary(), "  Water   kanji ", "c1", 1000);

  it("creates a collection with a cleaned-up name", () => {
    expect(base.collections).toEqual([{ id: "c1", name: "Water kanji", kanji: [], createdAt: 1000 }]);
  });

  it("can start with kanji, without duplicates", () => {
    const lib = createCollection(emptyLibrary(), "N5", "c2", 0, ["日", "月", "日"]);
    expect(lib.collections[0].kanji).toEqual(["日", "月"]);
  });

  it("rejects blank names and duplicate ids", () => {
    expect(createCollection(base, "   ", "c2", 0)).toBe(base);
    expect(createCollection(base, "Other", "c1", 0)).toBe(base);
  });

  it("adds kanji once, in order, and removes them", () => {
    let lib = addToCollection(base, "c1", "海");
    lib = addToCollection(lib, "c1", "池");
    lib = addToCollection(lib, "c1", "海");
    expect(lib.collections[0].kanji).toEqual(["海", "池"]);
    lib = removeFromCollection(lib, "c1", "海");
    expect(lib.collections[0].kanji).toEqual(["池"]);
  });

  it("toggles membership", () => {
    let lib = toggleInCollection(base, "c1", "海");
    expect(collectionsContaining(lib, "海").map((c) => c.id)).toEqual(["c1"]);
    lib = toggleInCollection(lib, "c1", "海");
    expect(collectionsContaining(lib, "海")).toEqual([]);
    expect(toggleInCollection(lib, "missing", "海")).toBe(lib);
  });

  it("renames, ignoring blank names", () => {
    expect(renameCollection(base, "c1", "Rivers").collections[0].name).toBe("Rivers");
    expect(renameCollection(base, "c1", " ").collections[0].name).toBe("Water kanji");
  });

  it("deletes a collection", () => {
    expect(deleteCollection(base, "c1").collections).toEqual([]);
  });
});

describe("cleanName", () => {
  it("caps the length", () => {
    expect(cleanName("x".repeat(100))).toHaveLength(60);
  });
});

describe("parseLibrary", () => {
  it("round-trips a saved library", () => {
    const lib = addToCollection(createCollection(toggleBookmark(emptyLibrary(), "水"), "A", "c1", 5), "c1", "火");
    expect(parseLibrary(JSON.stringify(lib))).toEqual(lib);
  });

  it("starts fresh on missing, corrupt, or unknown-version data", () => {
    expect(parseLibrary(null)).toEqual(emptyLibrary());
    expect(parseLibrary("{not json")).toEqual(emptyLibrary());
    expect(parseLibrary("42")).toEqual(emptyLibrary());
    expect(parseLibrary(JSON.stringify({ version: 99, bookmarks: ["水"] }))).toEqual(emptyLibrary());
  });

  it("drops malformed entries but keeps the rest", () => {
    const parsed = parseLibrary(
      JSON.stringify({
        version: 1,
        bookmarks: ["水", 3, "水", null, "火"],
        collections: [
          { id: "a", name: "Good", kanji: ["日", 1, "日"], createdAt: 1 },
          { id: "a", name: "Duplicate id", kanji: [] },
          { id: "b", name: "   ", kanji: [] },
          { name: "No id" },
          "junk",
          { id: "c", name: "No date", kanji: "not an array" },
        ],
      }),
    );
    expect(parsed.bookmarks).toEqual(["水", "火"]);
    expect(parsed.collections).toEqual([
      { id: "a", name: "Good", kanji: ["日"], createdAt: 1 },
      { id: "c", name: "No date", kanji: [], createdAt: 0 },
    ]);
  });
});
