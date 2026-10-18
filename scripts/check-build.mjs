// Checks dist/ after the build. Fails on:
// - internal links, images or og:image pointing to missing files;
// - Russian text left on /kz pages;
// - gtag.js in page HTML (it may only load after consent);
// - absolute URLs not on PUBLIC_SITE_URL.
// Warns about images over MAX_IMAGE_KB; prints the site URL and GA4 status.
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import path from "path";
import { loadEnv } from "vite";

const DIST = path.resolve("dist");

// Same value as astro.config.mjs: env variables first, then .env.
const SITE = new URL(loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "").PUBLIC_SITE_URL);
const SITE_PREFIX = `${SITE.origin}/`;

// Words allowed on /kz pages although they look Russian. Main list: kz-words.json (from the
// client's translation, see extract-kz-words.mjs). Keep the extra lists short.
const kzWords = JSON.parse(readFileSync(new URL("./kz-words.json", import.meta.url), "utf-8")).words;
const FROM_PACKAGING = ["артикул", "ккал", "г"]; // as on the KZ side of the packaging
const NOT_IN_TRANSLATION = ["каталог", "телефон", "география", "навигация", "философия", "ги"]; // our UI labels, to confirm with the translator
const DECLARATION_NUMBER = ["еаэс", "д", "ра", "в"]; // parts of declaration numbers
const SHARED_WORDS = new Set([...kzWords, ...FROM_PACKAGING, ...NOT_IN_TRANSLATION, ...DECLARATION_NUMBER]);

const MAX_IMAGE_KB = 400;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const resolveInternalPath = (linkPath) => {
  const clean = linkPath.split("#")[0].split("?")[0];
  if (clean === "") return path.join(DIST, "index.html");
  const candidates = [path.join(DIST, clean), path.join(DIST, clean, "index.html"), path.join(DIST, `${clean}.html`)];
  return candidates.find(existsSync) ?? null;
};

/** Visible text lines that contain Cyrillic, without scripts and styles. */
const cyrillicTexts = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /[а-яё]/i.test(s));

const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
const linkPattern = /\s(?:href|src)="(\/[^"]*)"/g;
const srcsetPattern = /\ssrcset="([^"]*)"/g;

const errors = [];
const gaIds = new Set();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const where = path.relative(DIST, file);

  const links = [...html.matchAll(linkPattern)].map((m) => m[1]);
  for (const m of html.matchAll(srcsetPattern)) {
    links.push(...m[1].split(",").map((entry) => entry.trim().split(/\s+/)[0]));
  }
  for (const link of links) {
    if (!link.startsWith("/") || link.startsWith("//")) continue; // external or protocol-relative
    if (!resolveInternalPath(link)) errors.push(`Broken internal link: ${link}  (found in ${where})`);
  }

  // og:image and twitter:image are absolute: check their path.
  for (const match of html.matchAll(/<meta[^>]+(?:og|twitter):image"[^>]+content="https?:\/\/[^/"]+(\/[^"]*)"/g)) {
    if (!resolveInternalPath(match[1])) errors.push(`Broken share image: ${match[1]}  (found in ${where})`);
  }

  // Own absolute URLs must use PUBLIC_SITE_URL.
  const ownUrls = [
    ...html.matchAll(/<link[^>]+rel="(?:canonical|alternate)"[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<meta[^>]+(?:og:url|og:image|twitter:image)"[^>]+content="([^"]+)"/g),
    ...html.matchAll(/data-site-url="([^"]+)"/g),
  ].map((m) => m[1]);
  // JSON-LD: the site's own URLs (Instagram and schema.org are external).
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    for (const [url] of json.matchAll(/https:\/\/[^"]+/g)) {
      if (!/^https:\/\/(schema\.org|(www\.)?instagram\.com)(\/|$)/.test(url)) ownUrls.push(url);
    }
  }
  for (const url of ownUrls) {
    if (!url.startsWith(SITE_PREFIX)) errors.push(`Not on ${SITE.origin}: ${url}  (in ${where})`);
  }
  for (const [, id] of html.matchAll(/data-ga-id="([^"]+)"/g)) gaIds.add(id);

  if (/<script[^>]+src="[^"]*(googletagmanager\.com|google-analytics\.com)/.test(html)) {
    errors.push(`Google Analytics loaded before consent: <script src> in ${where}`);
  }

  if (where.startsWith(`kz${path.sep}`)) {
    // dist/kz/catalog/ ↔ dist/catalog/
    const ruFile = path.join(DIST, path.relative(path.join(DIST, "kz"), file));
    if (!existsSync(ruFile)) continue;
    const ruTexts = new Set(cyrillicTexts(readFileSync(ruFile, "utf-8")));
    for (const text of new Set(cyrillicTexts(html))) {
      const foreign = (text.toLowerCase().match(/[а-яё]+/g) ?? []).filter((w) => !SHARED_WORDS.has(w));
      if (ruTexts.has(text) && foreign.length > 0) errors.push(`Russian text on a Kazakh page: "${text}"  (${where})`);
    }
  }
}

const heavyImages = walk(DIST)
  .filter((f) => /\.(avif|webp|jpe?g|png|gif|svg)$/i.test(f))
  .map((f) => ({ file: path.relative(DIST, f), kb: Math.round(statSync(f).size / 1024) }))
  .filter((img) => img.kb > MAX_IMAGE_KB)
  .sort((a, b) => b.kb - a.kb);
if (heavyImages.length > 0) {
  console.warn(`Warning: ${heavyImages.length} image(s) over ${MAX_IMAGE_KB} KB:`);
  for (const img of heavyImages) console.warn(`  ${img.kb} KB  ${img.file}`);
}

// sitemap and robots.txt
for (const file of walk(DIST).filter((f) => /sitemap.*\.xml$/.test(f))) {
  for (const [, url] of readFileSync(file, "utf-8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!url.startsWith(SITE_PREFIX)) errors.push(`Not on ${SITE.origin}: ${url}  (in ${path.relative(DIST, file)})`);
  }
}
const robots = path.join(DIST, "robots.txt");
const robotsSitemap = existsSync(robots) ? readFileSync(robots, "utf-8").match(/^Sitemap: (.+)$/m)?.[1] : undefined;
if (robotsSitemap !== `${SITE_PREFIX}sitemap-index.xml`) {
  errors.push(`robots.txt: expected "Sitemap: ${SITE_PREFIX}sitemap-index.xml", got "${robotsSitemap}"`);
}

console.log(`Site URL: ${SITE.origin} (canonical, hreflang, og, sitemap, robots.txt)`);
console.log(
  gaIds.size === 0
    ? "GA4: off (PUBLIC_GA_ID not set)"
    : `GA4: ${[...gaIds].join(", ")}, loads only on ${SITE.hostname} after consent`,
);
if (gaIds.size > 1) errors.push(`More than one GA4 ID in the build: ${[...gaIds].join(", ")}`);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}

console.log(`Build check passed: ${htmlFiles.length} pages, no broken links, no Russian text on /kz.`);
