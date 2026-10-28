"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_NOTE_LENGTH, setNote, type NoteField } from "@/lib/notes";
import { useNotes } from "./useLibrary";

const SAVE_DELAY_MS = 500;
// Only called from timers and event handlers, never during render.
const now = () => Date.now();

const FIELDS: { field: NoteField; label: string; hint: string }[] = [
  { field: "mnemonic", label: "Mnemonic", hint: "A memory story, e.g. “a person (亻) leaning on a tree (木) to rest”" },
  { field: "note", label: "Notes", hint: "Anything else, e.g. how to tell it apart from a look-alike" },
];

/** Personal mnemonic and notes for one kanji, saved as you type. */
export function NotesEditor({ character }: { character: string }) {
  const [notes, update] = useNotes();
  const stored = notes.kanji[character];
  // While typing, the draft wins; once saved it's cleared and the stored value shows.
  const [drafts, setDrafts] = useState<Partial<Record<NoteField, string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timers = useRef<Partial<Record<NoteField, ReturnType<typeof setTimeout>>>>({});
  const id = useId();

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const save = (field: NoteField, text: string) => {
    clearTimeout(timers.current[field]);
    update((n) => setNote(n, character, field, text, now()));
    setDrafts((d) => {
      const next = { ...d };
      delete next[field];
      return next;
    });
    setStatus("saved");
  };

  const change = (field: NoteField, text: string) => {
    setDrafts((d) => ({ ...d, [field]: text }));
    setStatus("saving");
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => save(field, text), SAVE_DELAY_MS);
  };

  return (
    <div className="space-y-4">
      {FIELDS.map(({ field, label, hint }) => {
        const value = drafts[field] ?? stored?.[field] ?? "";
        return (
          <div key={field}>
            <label htmlFor={`${id}-${field}`} className="mb-1 block text-sm font-medium">
              {label}
            </label>
            <textarea
              id={`${id}-${field}`}
              value={value}
              onChange={(e) => change(field, e.target.value)}
              onBlur={(e) => drafts[field] !== undefined && save(field, e.target.value)}
              maxLength={MAX_NOTE_LENGTH}
              rows={field === "mnemonic" ? 2 : 3}
              placeholder={hint}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted" aria-live="polite">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved in this browser." : "Notes are saved in this browser."}
      </p>
    </div>
  );
}
