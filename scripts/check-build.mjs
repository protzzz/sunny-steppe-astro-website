// Walks the built site and fails the build if:
// - any internal href/src/srcset (or og:image) points at a path that doesn't exist in dist/ —
//   a cheap guard against typos in localePath()/product ids and missing images;
// - a /kz page still shows Russian text, i.e. a string identical to the same Russian page that
//   contains a word the Kazakh translation doesn't use (a key missing from kz.ts falls back to Russian).
// - a page loads Google Analytics from its HTML: gtag.js may only be added by the consent script
//   after the visitor accepts (basic Consent Mode), never by a <script src> in the page itself.
// - an absolute link of the site (canonical, hreflang, og:url, og:image, sitemap, robots.txt, the GA4
//   domain) points anywhere but PUBLIC_SITE_URL — e.g. a build made with another value than the hosting's.
// It also warns (without failing) about images heavier than MAX_IMAGE_KB, and prints the site address
// and the GA4 status, so the hosting's build log shows what went live.
// No browser needed; what needs one (console errors, layout, clicks) is in tests/e2e.
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import path from "path";
import { loadEnv } from "vite";

const DIST = path.resolve("dist");

// The same value astro.config.mjs used: environment variables (hosting, CI) first, then .env.
const SITE = new URL(loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "").PUBLIC_SITE_URL);
const SITE_PREFIX = `${SITE.origin}/`;

// Words that are valid on a /kz page even when spelled like Russian. The main source is the
// client's Kazakh translation (scripts/kz-words.json, built by extract-kz-words.mjs): if the
// translator wrote "ксилит" or "бренд", that is the intended Kazakh. The short lists below
// cover what the translation files don't contain — keep them small and say where each came from.
const kzWords = JSON.parse(readFileSync(new URL("./kz-words.json", import.meta.url), "utf-8")).words;
const FROM_PACKAGING = ["артикул", "ккал", "г"]; // printed this way on the KZ side of the labels
const NOT_IN_TRANSLATION = ["каталог", "телефон", "география", "навигация", "философия", "ги"]; // our UI labels — ask the translator
const DECLARATION_NUMBER = ["еаэс", "д", "ра", "в"]; // e.g. "ЕАЭС N RU Д-CN.РА06.В.20103/26", must stay verbatim
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

  // og:image / twitter:image are absolute URLs, so check their path part too.
  for (const match of html.matchAll(/<meta[^>]+(?:og|twitter):image"[^>]+content="https?:\/\/[^/"]+(\/[^"]*)"/g)) {
    if (!resolveInternalPath(match[1])) errors.push(`Broken share image: ${match[1]}  (found in ${where})`);
  }

  // Absolute addresses of the site itself must all use PUBLIC_SITE_URL.
  const ownUrls = [
    ...html.matchAll(/<link[^>]+rel="(?:canonical|alternate)"[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<meta[^>]+(?:og:url|og:image|twitter:image)"[^>]+content="([^"]+)"/g),
    ...html.matchAll(/data-site-url="([^"]+)"/g),
  ].map((m) => m[1]);
  for (const url of ownUrls) {
    if (!url.startsWith(SITE_PREFIX)) errors.push(`Not on ${SITE.origin}: ${url}  (in ${where})`);
  }
  for (const [, id] of html.matchAll(/data-ga-id="([^"]+)"/g)) gaIds.add(id);

  if (/<script[^>]+src="[^"]*(googletagmanager\.com|google-analytics\.com)/.test(html)) {
    errors.push(`Google Analytics loaded before consent: <script src> in ${where}`);
  }

  if (where.startsWith(`kz${path.sep}`)) {
    // Russian pages live at the root: dist/kz/catalog/index.html ↔ dist/catalog/index.html.
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

// sitemap and robots.txt are not HTML, check them separately.
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
