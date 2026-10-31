import type { Sentence } from "@/lib/sentences";

/** Text with `character` picked out in the accent colour. */
function Highlighted({ text, character }: { text: string; character: string }) {
  return (
    <>
      {[...text].map((c, i) =>
        c === character ? (
          <span key={i} className="text-accent">
            {c}
          </span>
        ) : (
          c
        ),
      )}
    </>
  );
}

/** Example sentences with furigana, romaji (hidden by the header toggle), and English. */
export function ExampleSentences({ sentences, character }: { sentences: Sentence[]; character: string }) {
  if (sentences.length === 0) {
    return <p className="text-sm text-muted">No short, fully readable example sentences were found for this kanji.</p>;
  }
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {sentences.map((s) => (
          <li key={s.id} className="space-y-1 px-4 py-3">
            <p lang="ja" className="text-xl leading-loose">
              {s.ja.map(([text, reading], i) =>
                reading ? (
                  <ruby key={i}>
                    <Highlighted text={text} character={character} />
                    <rt className="text-[0.55em] text-muted">{reading}</rt>
                  </ruby>
                ) : (
                  <Highlighted key={i} text={text} character={character} />
                ),
              )}
            </p>
            <p lang="en" className="romaji text-sm text-muted">
              {s.romaji}
            </p>
            <p className="text-sm">
              {s.en}{" "}
              <a
                href={`https://tatoeba.org/en/sentences/show/${s.id}`}
                className="text-xs text-muted hover:text-accent"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="sr-only">Sentence </span>#{s.id}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        From the Tanaka Corpus on{" "}
        <a href="https://tatoeba.org" className="hover:text-accent" target="_blank" rel="noopener noreferrer">
          Tatoeba
        </a>{" "}
        (CC BY 2.0 FR). Furigana and romaji are generated from the corpus&apos;s word index and JMdict, so an
        occasional reading may be off.
      </p>
    </div>
  );
}
