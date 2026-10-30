import type { Metadata } from "next";
import { StudyApp } from "@/components/study/StudyApp";
import { getStudyKanji } from "@/lib/data";

export const metadata: Metadata = {
  title: "Study — Nierembergia",
  description: "Flashcards and quizzes from your bookmarks, collections, or a JLPT level.",
};

export default function StudyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
      <p className="mt-1 text-sm text-muted">
        Flashcards and quizzes from your bookmarks, collections, or a JLPT level.
      </p>
      <StudyApp all={getStudyKanji()} />
    </main>
  );
}
