"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { MAX_COMPARE, parseCompareParam } from "@/lib/compare";

/** Add or remove the kanji being compared; the list lives in `?k=`. */
export function CompareForm() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const current = parseCompareParam(params.get("k") ?? "");

  const go = (chars: string[]) => {
    const qs = chars.length ? `?k=${encodeURIComponent(chars.join(""))}` : "";
    startTransition(() => router.replace(`${pathname}${qs}`, { scroll: false }));
  };

  const full = current.length >= MAX_COMPARE;

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const added = parseCompareParam(current.join("") + input);
          setInput("");
          go(added);
        }}
        className="flex max-w-md gap-2"
      >
        <label htmlFor="compare-input" className="sr-only">
          Kanji to compare
        </label>
        <input
          id="compare-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={full}
          placeholder={full ? `Up to ${MAX_COMPARE} kanji` : "Type or paste kanji, e.g. 未末"}
          autoComplete="off"
          lang="ja"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-lg disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={full || parseCompareParam(input).length === 0}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
        >
          Add
        </button>
      </form>
      {current.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Kanji being compared">
          {current.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => go(current.filter((x) => x !== c))}
                aria-label={`Remove ${c}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 hover:border-accent"
              >
                <span lang="ja" className="font-serif text-lg leading-none">
                  {c}
                </span>
                <span aria-hidden className="text-muted">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
