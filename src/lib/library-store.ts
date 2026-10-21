import { emptyLibrary, parseLibrary, type Library } from "./library";

export const STORAGE_KEY = "nierembergia:library";

/** The subset of the Web Storage API the store needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LibraryStore {
  getSnapshot(): Library;
  getServerSnapshot(): Library;
  subscribe(listener: () => void): () => void;
  update(change: (library: Library) => Library): void;
  /** Re-reads storage, e.g. after another tab changed it. */
  refresh(): void;
}

/**
 * A small external store for useSyncExternalStore. Storage may be missing or
 * throw (private mode, blocked site data); the store then keeps working in
 * memory for the session.
 */
export function createLibraryStore(storage: StorageLike | null, key = STORAGE_KEY): LibraryStore {
  const listeners = new Set<() => void>();
  const serverSnapshot = emptyLibrary();
  let raw: string | null = null;
  let snapshot: Library | null = null;

  const read = (): string | null => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return raw;
    }
  };

  const load = () => {
    const next = read();
    if (snapshot && next === raw) return false;
    raw = next;
    snapshot = parseLibrary(next);
    return true;
  };

  const emit = () => listeners.forEach((l) => l());

  return {
    getSnapshot() {
      if (!snapshot) load();
      return snapshot!;
    },
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change) {
      const current = this.getSnapshot();
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
}
