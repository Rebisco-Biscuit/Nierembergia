import { romaji } from "@/lib/romaji";

/**
 * Romaji for a kana reading, shown next to it. Hidden everywhere at once when
 * the header's Romaji toggle is off (see `[data-romaji="off"]` in globals.css).
 */
export function Romaji({ reading, className = "" }: { reading: string; className?: string }) {
  return (
    <span lang="en" className={`romaji text-muted ${className}`}>
      {romaji(reading)}
    </span>
  );
}

/**
 * Readings in a row, each followed by its romaji: "スイ sui、みず mizu".
 * `display` formats the kana (e.g. dropping okurigana dots).
 */
export function ReadingList({
  readings,
  display = (r) => r,
  separator = "、",
  romajiClassName = "text-[0.85em]",
}: {
  readings: string[];
  display?: (reading: string) => string;
  separator?: string;
  romajiClassName?: string;
}) {
  return (
    <>
      {readings.map((r, i) => (
        <span key={r} className="inline-block whitespace-nowrap">
          <span lang="ja">{display(r)}</span> <Romaji reading={r} className={romajiClassName} />
          {i < readings.length - 1 && separator}
        </span>
      ))}
    </>
  );
}
