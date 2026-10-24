import type { Metadata } from "next";
import { ComponentExplorer } from "@/components/ComponentExplorer";
import { componentCatalog, dataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Components — Nierembergia",
  description: "Browse and search the building blocks of kanji.",
};

export default function ComponentsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
      <p className="mt-1 text-sm text-muted">
        The {componentCatalog.length.toLocaleString("en")} building blocks that kanji are made from. Search by
        character, English name, or radical number.
      </p>
      <ComponentExplorer catalog={componentCatalog} radicals={dataset.radicals} />
    </main>
  );
}
