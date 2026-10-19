import Link from "next/link";

export default function ComponentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p lang="ja" className="font-serif text-6xl text-muted">
        無
      </p>
      <h1 className="mt-4 text-lg font-medium">Component not found</h1>
      <p className="mt-2 text-sm text-muted">
        No kanji in the dataset uses this character as a component.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Back to search
      </Link>
    </main>
  );
}
