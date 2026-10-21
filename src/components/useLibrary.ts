"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Library } from "@/lib/library";
import { createLibraryStore, STORAGE_KEY, type LibraryStore } from "@/lib/library-store";

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// One store per browser tab, shared by every component.
let store: LibraryStore | null = null;
const getStore = () => (store ??= createLibraryStore(browserStorage()));

/**
 * The user's bookmarks and collections, saved in this browser. Renders as an
 * empty library on the server and during hydration, then fills in.
 */
export function useLibrary(): [Library, LibraryStore["update"]] {
  const s = getStore();
  const library = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);

  // Keep tabs in sync: another tab writing the key fires "storage" here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) s.refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [s]);

  return [library, s.update.bind(s)];
}

/** A random id for a new collection. */
export function newCollectionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
