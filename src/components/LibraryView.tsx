"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MAX_COLLECTION_NAME,
  cleanName,
  createCollection,
  deleteCollection,
  removeFromCollection,
  renameCollection,
  toggleBookmark,
  type Collection,
} from "@/lib/library";
import { KanjiTile } from "./KanjiTile";
import { newCollectionId, useHydrated, useLibrary } from "./useLibrary";

type Meanings = Record<string, string>;

export function LibraryView({ meanings }: { meanings: Meanings }) {
  const [library, update] = useLibrary();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading your library">
        <div className="h-5 w-32 animate-pulse rounded bg-border" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-12">
      <section aria-labelledby="bookmarks-heading">
        <h2 id="bookmarks-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Bookmarks {library.bookmarks.length > 0 && `(${library.bookmarks.length})`}
        </h2>
        {library.bookmarks.length === 0 ? (
          <Empty>
            No bookmarks yet. Use <span aria-hidden>☆</span> Bookmark on any{" "}
            <Link href="/" className="text-accent hover:underline">
              kanji page
            </Link>
            .
          </Empty>
        ) : (
          <KanjiList
            kanji={library.bookmarks}
            meanings={meanings}
            removeLabel="Remove bookmark"
            onRemove={(k) => update((lib) => toggleBookmark(lib, k))}
          />
        )}
      </section>

      <section aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Collections {library.collections.length > 0 && `(${library.collections.length})`}
        </h2>
        <NewCollectionForm onCreate={(name) => update((lib) => createCollection(lib, name, newCollectionId(), Date.now()))} />
        {library.collections.length === 0 ? (
          <div className="mt-4">
            <Empty>No collections yet. Create one above, or from any kanji page.</Empty>
          </div>
        ) : (
          <ul className="mt-6 space-y-6">
            {library.collections.map((c) => (
              <li key={c.id}>
                <CollectionCard collection={c} meanings={meanings} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CollectionCard({ collection, meanings }: { collection: Collection; meanings: Meanings }) {
  const [, update] = useLibrary();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(collection.name);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update((lib) => renameCollection(lib, collection.id, name));
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <form onSubmit={save} className="flex flex-1 gap-2">
            <label className="sr-only" htmlFor={`rename-${collection.id}`}>
              Collection name
            </label>
            <input
              id={`rename-${collection.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_COLLECTION_NAME}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setName(collection.name);
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1"
            />
            <button type="submit" disabled={!cleanName(name)} className="rounded-lg bg-accent px-3 py-1 text-sm text-accent-foreground disabled:opacity-40">
              Save
            </button>
          </form>
        ) : (
          <>
            <h3 className="font-medium">{collection.name}</h3>
            <span className="text-sm text-muted">{collection.kanji.length} kanji</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-muted hover:text-foreground">
              Rename
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => update((lib) => deleteCollection(lib, collection.id))}
                  className="font-medium text-red-600 dark:text-red-400"
                >
                  Delete “{collection.name}”
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-muted">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-muted hover:text-foreground">
                Delete
              </button>
            )}
          </>
        )}
      </div>
      {collection.kanji.length === 0 ? (
        <p className="text-sm text-muted">Empty. Add kanji from their pages with the Collections button.</p>
      ) : (
        <KanjiList
          kanji={collection.kanji}
          meanings={meanings}
          removeLabel={`Remove from ${collection.name}`}
          onRemove={(k) => update((lib) => removeFromCollection(lib, collection.id, k))}
        />
      )}
    </div>
  );
}

function KanjiList({
  kanji,
  meanings,
  removeLabel,
  onRemove,
}: {
  kanji: string[];
  meanings: Meanings;
  removeLabel: string;
  onRemove: (kanji: string) => void;
}) {
  // Saved characters that are no longer in the dataset are skipped, not shown broken.
  const known = kanji.filter((k) => k in meanings);
  return (
    <ul className="flex flex-wrap gap-2">
      {known.map((k) => (
        <li key={k} className="relative">
          <KanjiTile kanji={{ character: k, meanings: meanings[k] ? [meanings[k]] : [] }} />
          <button
            type="button"
            onClick={() => onRemove(k)}
            aria-label={`${removeLabel}: ${k}`}
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-xs text-muted hover:border-accent hover:text-foreground"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewCollectionForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!cleanName(name)) return;
        onCreate(name);
        setName("");
      }}
      className="flex max-w-md gap-2"
    >
      <label htmlFor="new-collection" className="sr-only">
        New collection name
      </label>
      <input
        id="new-collection"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_COLLECTION_NAME}
        placeholder="New collection, e.g. “Water radicals”"
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5"
      />
      <button
        type="submit"
        disabled={!cleanName(name)}
        className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-40"
      >
        Create
      </button>
    </form>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}
