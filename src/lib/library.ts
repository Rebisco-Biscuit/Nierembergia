// The user's saved kanji: bookmarks and named collections. Pure functions
// over an immutable state; persistence lives in library-store.ts.

export const LIBRARY_VERSION = 1;
export const MAX_COLLECTION_NAME = 60;

export interface Collection {
  id: string;
  name: string;
  /** Kanji in the order they were added. */
  kanji: string[];
  createdAt: number;
}

export interface Library {
  version: typeof LIBRARY_VERSION;
  /** Bookmarked kanji, most recent first. */
  bookmarks: string[];
  collections: Collection[];
}

export const emptyLibrary = (): Library => ({
  version: LIBRARY_VERSION,
  bookmarks: [],
  collections: [],
});

export const isBookmarked = (library: Library, kanji: string) => library.bookmarks.includes(kanji);

export function toggleBookmark(library: Library, kanji: string): Library {
  return {
    ...library,
    bookmarks: isBookmarked(library, kanji)
      ? library.bookmarks.filter((k) => k !== kanji)
      : [kanji, ...library.bookmarks],
  };
}

/** Trims and collapses whitespace; returns null if nothing usable is left. */
export function cleanName(name: string): string | null {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, MAX_COLLECTION_NAME);
  return clean || null;
}

export function createCollection(
  library: Library,
  name: string,
  id: string,
  now: number,
  initialKanji: string[] = [],
): Library {
  const clean = cleanName(name);
  if (!clean || library.collections.some((c) => c.id === id)) return library;
  return {
    ...library,
    collections: [
      ...library.collections,
      { id, name: clean, kanji: [...new Set(initialKanji)], createdAt: now },
    ],
  };
}

function updateCollection(
  library: Library,
  id: string,
  update: (c: Collection) => Collection,
): Library {
  return {
    ...library,
    collections: library.collections.map((c) => (c.id === id ? update(c) : c)),
  };
}

export function renameCollection(library: Library, id: string, name: string): Library {
  const clean = cleanName(name);
  return clean ? updateCollection(library, id, (c) => ({ ...c, name: clean })) : library;
}

export function deleteCollection(library: Library, id: string): Library {
  return { ...library, collections: library.collections.filter((c) => c.id !== id) };
}

export function addToCollection(library: Library, id: string, kanji: string): Library {
  return updateCollection(library, id, (c) =>
    c.kanji.includes(kanji) ? c : { ...c, kanji: [...c.kanji, kanji] },
  );
}

export function removeFromCollection(library: Library, id: string, kanji: string): Library {
  return updateCollection(library, id, (c) => ({ ...c, kanji: c.kanji.filter((k) => k !== kanji) }));
}

export function toggleInCollection(library: Library, id: string, kanji: string): Library {
  const collection = library.collections.find((c) => c.id === id);
  if (!collection) return library;
  return collection.kanji.includes(kanji)
    ? removeFromCollection(library, id, kanji)
    : addToCollection(library, id, kanji);
}

export const collectionsContaining = (library: Library, kanji: string) =>
  library.collections.filter((c) => c.kanji.includes(kanji));

const isString = (v: unknown): v is string => typeof v === "string";
const uniqueStrings = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter(isString))] : [];

/**
 * Reads a stored library defensively: anything malformed is dropped rather
 * than breaking the app, and unknown versions start fresh.
 */
export function parseLibrary(raw: string | null): Library {
  if (!raw) return emptyLibrary();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyLibrary();
  }
  if (typeof data !== "object" || data === null) return emptyLibrary();
  const obj = data as Record<string, unknown>;
  if (obj.version !== LIBRARY_VERSION) return emptyLibrary();

  const seenIds = new Set<string>();
  const collections: Collection[] = [];
  for (const c of Array.isArray(obj.collections) ? obj.collections : []) {
    if (typeof c !== "object" || c === null) continue;
    const { id, name, kanji, createdAt } = c as Record<string, unknown>;
    const clean = isString(name) ? cleanName(name) : null;
    if (!isString(id) || seenIds.has(id) || !clean) continue;
    seenIds.add(id);
    collections.push({
      id,
      name: clean,
      kanji: uniqueStrings(kanji),
      createdAt: typeof createdAt === "number" ? createdAt : 0,
    });
  }

  return { version: LIBRARY_VERSION, bookmarks: uniqueStrings(obj.bookmarks), collections };
}
