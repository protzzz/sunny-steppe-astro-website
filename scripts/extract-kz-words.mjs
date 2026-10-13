// Builds scripts/kz-words.json — every Cyrillic word used in the client's Kazakh texts.
// check-build.mjs treats these as valid Kazakh even when they are spelled like Russian
// (ксилит, таурин, бренд…): if the translator wrote it that way, it is meant to be that way.
// Run it again whenever the translation files change:
//   node scripts/extract-kz-words.mjs [folder with the KZ .docx files]
import { execFileSync } from "child_process";
import { readdirSync, writeFileSync } from "fs";
import path from "path";

const dir = path.resolve(process.argv[2] ?? "../assets/text/kz");
const files = readdirSync(dir).filter((f) => f.endsWith(".docx"));
if (files.length === 0) throw new Error(`No .docx files in ${dir}`);

const words = new Set();
for (const file of files) {
  // A .docx is a zip; the text lives in word/document.xml.
  const xml = execFileSync("unzip", ["-p", path.join(dir, file), "word/document.xml"], { encoding: "utf-8" });
  // Word may split one word across several runs, so only paragraph/tab/break tags become spaces.
  const text = xml.replace(/<\/w:p>|<w:tab\/>|<w:br\/>/g, " ").replace(/<[^>]+>/g, "");
  for (const w of text.toLowerCase().match(/[а-яёәғқңөұүһі]+/g) ?? []) words.add(w);
}

const out = path.resolve("scripts/kz-words.json");
writeFileSync(out, JSON.stringify({ source: files.sort(), words: [...words].sort() }, null, 2) + "\n");
console.log(`${words.size} words from ${files.length} files → ${path.relative(process.cwd(), out)}`);
