"use client";

import { backupFilename, countData, createBackup, type DataCounts } from "@/lib/backup";
import { useLibrary, useNotes, useProgress } from "./useLibrary";

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

/** Download everything saved in this browser as one JSON file. */
export function BackupPanel() {
  const [library] = useLibrary();
  const [progress] = useProgress();
  const [notes] = useNotes();
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
    </section>
  );
}
