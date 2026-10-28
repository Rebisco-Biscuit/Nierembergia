"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Library } from "@/lib/library";
import {
  createLibraryStore,
  createNotesStore,
  createProgressStore,
  type JsonStore,
  type LibraryStore,
  type NotesStore,
  type ProgressStore,
} from "@/lib/library-store";
import type { Notes } from "@/lib/notes";
import type { Progress } from "@/lib/progress";

function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// One store of each kind per browser tab, shared by every component.
let libraryStore: LibraryStore | null = null;
let progressStore: ProgressStore | null = null;
let notesStore: NotesStore | null = null;
const getLibraryStore = () => (libraryStore ??= createLibraryStore(browserStorage()));
const getProgressStore = () => (progressStore ??= createProgressStore(browserStorage()));
const getNotesStore = () => (notesStore ??= createNotesStore(browserStorage()));

/** Subscribes to a store, re-reading it when another tab writes its key. */
function useJsonStore<T>(s: JsonStore<T>): [T, JsonStore<T>["update"]] {
  const value = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === s.key || e.key === null) s.refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [s]);

  return [value, s.update];
}

/**
 * The user's bookmarks and collections, saved in this browser. Renders as an
 * empty library on the server and during hydration, then fills in.
 */
export const useLibrary = (): [Library, LibraryStore["update"]] => useJsonStore(getLibraryStore());

/** The user's study progress, saved in this browser. Empty on the server. */
export const useProgress = (): [Progress, ProgressStore["update"]] => useJsonStore(getProgressStore());

/** The user's notes and mnemonics, saved in this browser. Empty on the server. */
export const useNotes = (): [Notes, NotesStore["update"]] => useJsonStore(getNotesStore());

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true once running in the browser. */
export const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** A random id for a new collection. */
export function newCollectionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
