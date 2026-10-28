import type { Metadata } from "next";
import { LibraryView } from "@/components/LibraryView";
import { dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Your library — Nierembergia",
  description: "Your bookmarked kanji and collections.",
};

export default function LibraryPage() {
  // The library lives in the browser, so the client needs each kanji's
  // meaning to show the saved characters.
  const meanings = Object.fromEntries(dataset.kanji.map((k) => [k.character, k.meanings[0] ?? ""]));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-1 text-sm text-muted">
        Bookmarks, collections, and notes are saved in this browser only.
      </p>
      <LibraryView meanings={meanings} />
    </main>
  );
}
