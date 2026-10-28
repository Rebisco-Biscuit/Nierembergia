"use client";

import { useNotes } from "./useLibrary";

/** The user's mnemonic and note for a kanji, if any; nothing otherwise. */
export function KanjiNoteSnippet({ character, className = "" }: { character: string; className?: string }) {
  const [notes] = useNotes();
  const note = notes.kanji[character];
  if (!note) return null;

  return (
    <div className={`space-y-1 rounded-lg bg-accent-soft px-3 py-2 text-left text-sm ${className}`}>
      {note.mnemonic.trim() && (
        <p>
          <span className="font-medium text-accent">Mnemonic: </span>
          <span className="whitespace-pre-line">{note.mnemonic}</span>
        </p>
      )}
      {note.note.trim() && (
        <p>
          <span className="font-medium text-accent">Note: </span>
          <span className="whitespace-pre-line">{note.note}</span>
        </p>
      )}
    </div>
  );
}
