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
