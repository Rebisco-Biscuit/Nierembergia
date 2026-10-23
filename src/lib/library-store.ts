import { emptyLibrary, parseLibrary, type Library } from "./library";
import { emptyProgress, parseProgress, type Progress } from "./progress";

export const STORAGE_KEY = "nierembergia:library";
export const PROGRESS_KEY = "nierembergia:progress";

/** The subset of the Web Storage API the store needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface JsonStore<T> {
  key: string;
  getSnapshot(): T;
  getServerSnapshot(): T;
  subscribe(listener: () => void): () => void;
  update(change: (value: T) => T): void;
  /** Re-reads storage, e.g. after another tab changed it. */
  refresh(): void;
}

export type LibraryStore = JsonStore<Library>;
export type ProgressStore = JsonStore<Progress>;

/**
 * A small external store for useSyncExternalStore, holding one JSON value
 * under one storage key. Storage may be missing or throw (private mode,
 * blocked site data); the store then keeps working in memory for the session.
 */
export function createJsonStore<T>(
  storage: StorageLike | null,
  key: string,
  parse: (raw: string | null) => T,
  empty: () => T,
): JsonStore<T> {
  const listeners = new Set<() => void>();
  const serverSnapshot = empty();
  let raw: string | null = null;
  let snapshot: T | null = null;

  const read = (): string | null => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return raw;
    }
  };

  const load = () => {
    const next = read();
    if (snapshot !== null && next === raw) return false;
    raw = next;
    snapshot = parse(next);
    return true;
  };

  const emit = () => listeners.forEach((l) => l());

  const store: JsonStore<T> = {
    key,
    getSnapshot() {
      if (snapshot === null) load();
      return snapshot!;
    },
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change) {
      const current = store.getSnapshot();
      const next = change(current);
      if (next === current) return;
      snapshot = next;
      raw = JSON.stringify(next);
      try {
        storage?.setItem(key, raw);
      } catch {
        // Not persisted (quota or blocked storage); still applied in memory.
      }
      emit();
    },
    refresh() {
      if (load()) emit();
    },
  };
  return store;
}

export const createLibraryStore = (storage: StorageLike | null, key = STORAGE_KEY): LibraryStore =>
  createJsonStore(storage, key, parseLibrary, emptyLibrary);

export const createProgressStore = (storage: StorageLike | null, key = PROGRESS_KEY): ProgressStore =>
  createJsonStore(storage, key, parseProgress, emptyProgress);
