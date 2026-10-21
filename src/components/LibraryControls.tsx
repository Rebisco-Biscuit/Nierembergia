"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  MAX_COLLECTION_NAME,
  cleanName,
  collectionsContaining,
  createCollection,
  isBookmarked,
  toggleBookmark,
  toggleInCollection,
} from "@/lib/library";
import { newCollectionId, useLibrary } from "./useLibrary";

/** Bookmark and collection controls for one kanji. */
export function LibraryControls({ character }: { character: string }) {
  const [library, update] = useLibrary();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const panelId = useId();

  const bookmarked = isBookmarked(library, character);
  const inCount = collectionsContaining(library, character).length;

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanName(name)) return;
    update((lib) => createCollection(lib, name, newCollectionId(), Date.now(), [character]));
    setName("");
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={bookmarked}
          onClick={() => update((lib) => toggleBookmark(lib, character))}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            bookmarked
              ? "bg-accent text-accent-foreground"
              : "border border-border hover:border-accent"
          }`}
        >
          <span aria-hidden>{bookmarked ? "★" : "☆"}</span> {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent"
        >
          Collections{inCount > 0 && <span className="ml-1 text-accent">({inCount})</span>}{" "}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="mt-2 max-w-sm space-y-3 rounded-xl border border-border bg-surface p-3"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          {library.collections.length > 0 ? (
            <fieldset>
              <legend className="mb-1 text-xs text-muted">
                Add <span lang="ja">{character}</span> to:
              </legend>
              <ul className="space-y-1">
                {library.collections.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={c.kanji.includes(character)}
                        onChange={() => update((lib) => toggleInCollection(lib, c.id, character))}
                        className="accent-[var(--accent)]"
                      />
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-muted">{c.kanji.length}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : (
            <p className="text-sm text-muted">No collections yet.</p>
          )}
          <form onSubmit={create} className="flex gap-2">
            <label className="sr-only" htmlFor={`${panelId}-name`}>
              New collection name
            </label>
            <input
              id={`${panelId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_COLLECTION_NAME}
              placeholder="New collection"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={!cleanName(name)}
              className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              Create
            </button>
          </form>
          <Link href="/library" className="block text-xs text-accent hover:underline">
            Manage your library →
          </Link>
        </div>
      )}
    </div>
  );
}
