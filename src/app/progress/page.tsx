import type { Metadata } from "next";
import { ProgressDashboard } from "@/components/ProgressDashboard";
import { getDashboardKanji } from "@/lib/data";

export const metadata: Metadata = {
  title: "Progress — Nierembergia",
  description: "Your study activity, accuracy, JLPT progress, and weak spots.",
};

export default function ProgressPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
      <p className="mt-1 text-sm text-muted">Everything here comes from study progress saved in this browser.</p>
      <ProgressDashboard kanji={getDashboardKanji()} />
    </main>
  );
}
