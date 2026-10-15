"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p lang="ja" className="font-serif text-6xl text-muted">
        困
      </p>
      <h1 className="mt-4 text-lg font-medium">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The search couldn&apos;t be completed.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Try again
      </button>
    </main>
  );
}
