// Builds kz-words.json from the client's KZ .docx files (allowed words for check-build).
// Rerun after the translation changes: node scripts/extract-kz-words.mjs [docx folder]
import { execFileSync } from "child_process";
import { readdirSync, writeFileSync } from "fs";
import path from "path";

const dir = path.resolve(process.argv[2] ?? "../assets/text/kz");
const files = readdirSync(dir).filter((f) => f.endsWith(".docx"));
if (files.length === 0) throw new Error(`No .docx files in ${dir}`);

const words = new Set();
for (const file of files) {
  // Text of a .docx: word/document.xml.
  const xml = execFileSync("unzip", ["-p", path.join(dir, file), "word/document.xml"], { encoding: "utf-8" });
  // Only paragraph/tab/break tags become spaces (Word splits words across runs).
  const text = xml.replace(/<\/w:p>|<w:tab\/>|<w:br\/>/g, " ").replace(/<[^>]+>/g, "");
  for (const w of text.toLowerCase().match(/[а-яёәғқңөұүһі]+/g) ?? []) words.add(w);
}

const out = path.resolve("scripts/kz-words.json");
writeFileSync(out, JSON.stringify({ source: files.sort(), words: [...words].sort() }, null, 2) + "\n");
console.log(`${words.size} words from ${files.length} files → ${path.relative(process.cwd(), out)}`);
