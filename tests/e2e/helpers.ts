import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import astroConfig from "../../astro.config.mjs";
import { getDict, langNames, langs, localePath, type Lang } from "../../src/i18n/index";

export { getDict, langs, localePath, type Lang };

/** The RU/KZ switch in the header: one link to `target`, named "<language name> — <CODE>". */
export const langSwitch = (page: Page, target: Lang) =>
  page.getByRole("banner").getByRole("link", { name: `${langNames[target]} — ${target.toUpperCase()}`, exact: true });

export const isDev = process.env.E2E_MODE === "dev";
/** True when the tests run against the local production build, so dist/ can be read. */
export const hasDist = !isDev && !process.env.BASE_URL;

/** The site's setting, read from astro.config.mjs; Astro's default is "ignore". */
export const trailingSlash: "always" | "never" | "ignore" = astroConfig.trailingSlash ?? "ignore";

/** "kz" is our URL prefix, "kk" the ISO code in <html lang>. */
export const htmlLang = (lang: Lang) => (lang === "kz" ? "kk" : "ru");

/** Language of a URL path: Kazakh under /kz/, Russian everywhere else (it has no prefix). */
export const langOfPath = (pathname: string): Lang => (/^\/kz(\/|$)/.test(pathname) ? "kz" : "ru");

/** "/kz/product/gum/" → "/product/gum", "/product/gum/" → "/product/gum", "/kz/" → "/". */
export const withoutLang = (pathname: string) => pathname.replace(/^\/kz(?=\/|$)/, "").replace(/(.)\/$/, "$1") || "/";

/** Links to pages, not files: no extension, not Astro's own assets. */
export const isPageLink = (href: string) =>
  href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/_astro/") && !/\.[a-z0-9]+$/i.test(href);

const hrefPattern = /<a\s[^>]*href="([^"]+)"/g;
const crawls = new Map<Lang, Promise<string[]>>();

/**
 * Every page of one language, found by following <a href> from the language's home page.
 * Works the same on `astro dev` and on the build, and only finds pages a visitor can reach.
 * Paths are returned as the site links them (that format is checked separately).
 */
export const discoverPages = (request: APIRequestContext, lang: Lang) => {
  if (!crawls.has(lang)) {
    crawls.set(
      lang,
      (async () => {
        const seen = new Map<string, string>(); // normalized → as linked
        const queue = [localePath(lang)];
        while (queue.length > 0) {
          const link = queue.shift()!;
          const key = withoutLang(link);
          if (seen.has(key)) continue;
          seen.set(key, link);
          const res = await request.get(link);
          if (!res.ok()) continue; // reported by the page checks
          for (const [, href] of (await res.text()).matchAll(hrefPattern)) {
            const clean = href.split("#")[0].split("?")[0];
            if (isPageLink(clean) && langOfPath(clean) === lang && !seen.has(withoutLang(clean))) queue.push(clean);
          }
        }
        return [...seen.values()].sort();
      })(),
    );
  }
  return crawls.get(lang)!;
};

/** Built pages, as URL paths: dist/kz/about/index.html → "/kz/about", dist/index.html → "/". */
export const distPages = () => {
  const dist = path.resolve("dist");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return walk(dist)
    .filter((f) => f.endsWith(".html"))
    .map(
      (f) =>
        "/" +
        path
          .relative(dist, f)
          .replace(/(^|\/)index\.html$/, "")
          .replace(/\.html$/, ""),
    )
    .map((p) => p.replace(/\/$/, "") || "/");
};

/** Does this internal link match the trailingSlash setting? */
export const matchesTrailingSlash = (href: string) => {
  const p = href.split("#")[0].split("?")[0];
  if (p === "/") return true;
  if (trailingSlash === "always") return p.endsWith("/");
  if (trailingSlash === "never") return !p.endsWith("/");
  return true;
};

/** Non-fatal findings, printed together at the end of the run by warnings-reporter.ts. */
export const warn = (testInfo: TestInfo, message: string) =>
  testInfo.annotations.push({ type: "warning", description: message });

export const WHATSAPP = /^https:\/\/wa\.me\/\d+$/;

/** Waits until every island has hydrated and every image has had the chance to load. */
export const settle = async (page: Page) => {
  // client:visible islands only hydrate on screen, and lazy images only load near it.
  for (const island of await page.locator("astro-island").all()) await island.scrollIntoViewIfNeeded();
  // Astro removes `ssr` once an island has rendered on the client; a crash leaves it in place.
  await expect(page.locator("astro-island[ssr]"), "islands that did not hydrate").toHaveCount(0);
  // Images hidden on purpose (the back of the pack) stay lazy forever, so load them now.
  await page
    .locator('img[loading="lazy"]')
    .evaluateAll((imgs) => imgs.forEach((i) => ((i as HTMLImageElement).loading = "eager")));
  await page.evaluate(() => window.scrollTo(0, 0));
};
