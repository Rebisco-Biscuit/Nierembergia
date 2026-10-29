"use client";

import { useId, useState } from "react";
import {
  backupFilename,
  countData,
  createBackup,
  mergeData,
  parseBackup,
  type DataCounts,
  type UserData,
} from "@/lib/backup";
import { useLibrary, useNotes, useProgress } from "./useLibrary";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ImportState =
  | { step: "idle" }
  | { step: "error"; message: string }
  | { step: "preview"; data: UserData; exportedAt: string | null; fileName: string }
  | { step: "done"; message: string };

// Only called from event handlers.
const now = () => Date.now();

export function describeCounts(c: DataCounts): string {
  const parts = [
    [c.bookmarks, "bookmark"],
    [c.collections, "collection"],
    [c.studied, "studied kanji"],
    [c.sessions, "session"],
    [c.notes, "note"],
  ] as const;
  return parts
    .map(([n, label]) => `${n.toLocaleString("en")} ${label}${n === 1 || label === "studied kanji" ? "" : "s"}`)
    .join(" · ");
}

/** Download everything saved in this browser as one JSON file, or restore from one. */
export function BackupPanel() {
  const [library, updateLibrary] = useLibrary();
  const [progress, updateProgress] = useProgress();
  const [notes, updateNotes] = useNotes();
  const [imported, setImported] = useState<ImportState>({ step: "idle" });
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const fileId = useId();
  const data = { library, progress, notes };
  const counts = countData(data);
  const empty = Object.values(counts).every((n) => n === 0);

  const download = () => {
    const t = now();
    const blob = new Blob([JSON.stringify(createBackup(data, t), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFilename(t);
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setImported({ step: "error", message: "That file is too large to be a Nierembergia backup." });
      return;
    }
    const parsed = parseBackup(await file.text());
    setImported(
      parsed.ok
        ? { step: "preview", data: parsed.data, exportedAt: parsed.exportedAt, fileName: file.name }
        : { step: "error", message: parsed.error },
    );
  };

  const apply = () => {
    if (imported.step !== "preview") return;
    const next = mode === "merge" ? mergeData(data, imported.data) : imported.data;
    updateLibrary(() => next.library);
    updateProgress(() => next.progress);
    updateNotes(() => next.notes);
    setImported({
      step: "done",
      message: mode === "merge" ? "Backup merged into your data." : "Your data was replaced with the backup.",
    });
  };

  return (
    <section aria-labelledby="backup-heading" className="space-y-4">
      <h2 id="backup-heading" className="text-sm font-semibold uppercase tracking-wider text-muted">
        Back up &amp; restore
      </h2>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm">
          Everything here lives in this browser only. Download a backup to keep it safe or move it to another device.
        </p>
        <p className="mt-2 text-xs text-muted">{describeCounts(counts)}</p>
        <button
          type="button"
          onClick={download}
          disabled={empty}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
        >
          Download backup
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <label htmlFor={fileId} className="text-sm font-medium">
          Restore from a backup file
        </label>
        <input
          id={fileId}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void readFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm hover:file:border-accent"
        />

        {imported.step === "error" && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {imported.message}
          </p>
        )}
        {imported.step === "done" && (
          <p role="status" className="mt-3 text-sm text-success">
            {imported.message}
          </p>
        )}
        {imported.step === "preview" && (
          <div className="mt-4 space-y-3 rounded-lg bg-background p-3 text-sm">
            <p>
              <span className="font-medium">{imported.fileName}</span>
              {imported.exportedAt && (
                <span className="text-muted">
                  {" "}
                  · exported{" "}
                  {new Date(imported.exportedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </p>
            <p className="text-muted">Contains {describeCounts(countData(imported.data))}.</p>
            <fieldset className="space-y-1.5">
              <legend className="sr-only">How to import</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-medium">Merge</span>{" "}
                  <span className="text-muted">— keep everything you have and add what&apos;s in the backup.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-medium">Replace</span>{" "}
                  <span className="text-muted">— discard what&apos;s saved here and use the backup instead.</span>
                </span>
              </label>
            </fieldset>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={apply}
                className={`rounded-lg px-4 py-2 font-medium ${mode === "replace" ? "bg-danger text-background" : "bg-accent text-accent-foreground"}`}
              >
                {mode === "merge" ? "Merge backup" : "Replace my data"}
              </button>
              <button
                type="button"
                onClick={() => setImported({ step: "idle" })}
                className="rounded-lg px-4 py-2 text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
