"use client";

import Link from "next/link";
import { useLibrary } from "./useLibrary";

export function SiteHeader() {
  const [library] = useLibrary();
  const count = library.bookmarks.length;
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 text-sm">
        <Link href="/" className="font-semibold tracking-tight hover:text-accent">
          Nierembergia
        </Link>
        <Link href="/library" className="flex items-center gap-1.5 text-muted hover:text-foreground">
          <span aria-hidden>★</span> Library
          {count > 0 && (
            <span className="rounded-full bg-accent-soft px-1.5 text-xs font-medium text-accent">
              {count}
              <span className="sr-only"> bookmarked</span>
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
