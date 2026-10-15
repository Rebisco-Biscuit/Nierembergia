import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
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
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
