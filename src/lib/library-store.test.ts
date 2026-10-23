import { describe, expect, it, vi } from "vitest";
import { toggleBookmark } from "./library";
import { createLibraryStore, type StorageLike } from "./library-store";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("createLibraryStore", () => {
  it("loads what was saved before", () => {
    const storage = memoryStorage({ lib: JSON.stringify({ version: 1, bookmarks: ["水"], collections: [] }) });
    expect(createLibraryStore(storage, "lib").getSnapshot().bookmarks).toEqual(["水"]);
  });

  it("returns the same snapshot until something changes", () => {
    const store = createLibraryStore(memoryStorage(), "lib");
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("persists updates and notifies subscribers", () => {
    const storage = memoryStorage();
    const store = createLibraryStore(storage, "lib");
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((lib) => toggleBookmark(lib, "火"));
    expect(store.getSnapshot().bookmarks).toEqual(["火"]);
    expect(JSON.parse(storage.data.lib).bookmarks).toEqual(["火"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips no-op updates", () => {
    const store = createLibraryStore(memoryStorage(), "lib");
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((lib) => lib);
    expect(listener).not.toHaveBeenCalled();
  });

  it("picks up changes made elsewhere on refresh", () => {
    const storage = memoryStorage();
    const store = createLibraryStore(storage, "lib");
    store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    storage.setItem("lib", JSON.stringify({ version: 1, bookmarks: ["木"], collections: [] }));
    store.refresh();
    expect(store.getSnapshot().bookmarks).toEqual(["木"]);
    expect(listener).toHaveBeenCalledTimes(1);
    store.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage throws", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createLibraryStore(broken, "lib");
    expect(store.getSnapshot().bookmarks).toEqual([]);
    store.update((lib) => toggleBookmark(lib, "水"));
    expect(store.getSnapshot().bookmarks).toEqual(["水"]);
  });

  it("works with no storage at all", () => {
    const store = createLibraryStore(null);
    store.update((lib) => toggleBookmark(lib, "水"));
    expect(store.getSnapshot().bookmarks).toEqual(["水"]);
  });

  it("keeps progress under its own key", async () => {
    const { createProgressStore } = await import("./library-store");
    const { recordAnswer } = await import("./progress");
    const storage = memoryStorage();
    const library = createLibraryStore(storage, "lib");
    const progress = createProgressStore(storage, "prog");
    progress.update((p) => recordAnswer(p, "水", true, 1));
    expect(JSON.parse(storage.data.prog).kanji["水"].seen).toBe(1);
    expect(storage.data.lib).toBeUndefined();
    expect(library.getSnapshot().bookmarks).toEqual([]);
  });

  it("gives the server an empty library", () => {
    const storage = memoryStorage({ lib: JSON.stringify({ version: 1, bookmarks: ["水"], collections: [] }) });
    expect(createLibraryStore(storage, "lib").getServerSnapshot().bookmarks).toEqual([]);
  });
});
