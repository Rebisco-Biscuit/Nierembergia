// Downloads the raw upstream datasets into data/raw/ (gitignored).
// Run `npm run data:fetch`, then `npm run data:build` to regenerate src/data/.
import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const RAW_DIR = path.join(import.meta.dirname, "..", "data", "raw");

const SOURCES = [
  {
    file: "kanjidic2.xml",
    url: "http://www.edrdg.org/kanjidic/kanjidic2.xml.gz",
    gzip: true,
  },
  {
    file: "kanji-data.json",
    url: "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json",
    gzip: false,
  },
  {
    file: "UnicodeData.txt",
    url: "https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt",
    gzip: false,
  },
];

await mkdir(RAW_DIR, { recursive: true });

for (const source of SOURCES) {
  process.stdout.write(`Fetching ${source.url} ... `);
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`${source.url}: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  const data = source.gzip ? gunzipSync(body) : body;
  await writeFile(path.join(RAW_DIR, source.file), data);
  console.log(`${(data.length / 1024 / 1024).toFixed(1)} MB`);
}
