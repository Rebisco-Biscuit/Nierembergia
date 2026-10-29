import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { ROMAJI_INIT_SCRIPT } from "@/lib/romaji-pref";
import "./globals.css";

// CJK fonts are large; let the browser fetch only the glyphs it needs.
const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  preload: false,
});

const notoSerif = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "600"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Nierembergia — Kanji Explorer",
  description:
    "Search kanji by character, meaning, reading, or radical, and explore how they are built.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-romaji="on"
      // The init script below may switch data-romaji before React hydrates.
      suppressHydrationWarning
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ROMAJI_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        {children}
        <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted">
          Kanji data from{" "}
          <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" className="underline-offset-2 hover:underline">
            KANJIDIC2
          </a>{" "}
          and{" "}
          <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" className="underline-offset-2 hover:underline">
            JMdict
          </a>{" "}
          (EDRDG, CC BY-SA 4.0); stroke order from{" "}
          <a href="https://kanjivg.tagaini.net/" className="underline-offset-2 hover:underline">
            KanjiVG
          </a>{" "}
          (CC BY-SA 3.0).
        </footer>
      </body>
    </html>
  );
}
