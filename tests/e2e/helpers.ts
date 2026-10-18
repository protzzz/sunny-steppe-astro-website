import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import astroConfig from "../../astro.config.mjs";
import { getDict, langNames, langs, localePath, type Lang } from "../../src/i18n/index";

export { getDict, langs, localePath, type Lang };

/** Header RU/KZ switch: a link to `target`. */
export const langSwitch = (page: Page, target: Lang) =>
  page.getByRole("banner").getByRole("link", { name: `${langNames[target]} — ${target.toUpperCase()}`, exact: true });

export const isDev = process.env.E2E_MODE === "dev";
/** Local production build: dist/ is readable. */
export const hasDist = !isDev && !process.env.BASE_URL;

/** From astro.config.mjs (Astro's default: "ignore"). */
export const trailingSlash: "always" | "never" | "ignore" = astroConfig.trailingSlash ?? "ignore";

/** URL "kz" → <html lang> "kk". */
export const htmlLang = (lang: Lang) => (lang === "kz" ? "kk" : "ru");

/** Language of a path: /kz/… is Kazakh, the rest Russian. */
export const langOfPath = (pathname: string): Lang => (/^\/kz(\/|$)/.test(pathname) ? "kz" : "ru");

/** "/kz/product/gum/" → "/product/gum", "/product/gum/" → "/product/gum", "/kz/" → "/". */
export const withoutLang = (pathname: string) => pathname.replace(/^\/kz(?=\/|$)/, "").replace(/(.)\/$/, "$1") || "/";

/** Links to pages, not files: no extension, not Astro's own assets. */
export const isPageLink = (href: string) =>
  href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/_astro/") && !/\.[a-z0-9]+$/i.test(href);

const hrefPattern = /<a\s[^>]*href="([^"]+)"/g;
const crawls = new Map<Lang, Promise<string[]>>();

/** All pages of a language, found by following links from its home page (dev and build). */
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
          if (!res.ok()) continue; // pages.spec reports it
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

/** Built pages as paths: dist/kz/about/index.html → "/kz/about". */
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

/** Link matches trailingSlash? */
export const matchesTrailingSlash = (href: string) => {
  const p = href.split("#")[0].split("?")[0];
  if (p === "/") return true;
  if (trailingSlash === "always") return p.endsWith("/");
  if (trailingSlash === "never") return !p.endsWith("/");
  return true;
};

/** Non-fatal finding, listed at the end by warnings-reporter.ts. */
export const warn = (testInfo: TestInfo, message: string) =>
  testInfo.annotations.push({ type: "warning", description: message });

export const WHATSAPP = /^https:\/\/wa\.me\/\d+$/;

/** Waits for all islands to hydrate and all images to load. */
export const settle = async (page: Page) => {
  // client:visible islands and lazy images need to be on screen.
  for (const island of await page.locator("astro-island").all()) await island.scrollIntoViewIfNeeded();
  // `ssr` is removed after hydration; a crash leaves it.
  await expect(page.locator("astro-island[ssr]"), "islands that did not hydrate").toHaveCount(0);
  // Hidden images (back of the pack) would stay lazy.
  await page
    .locator('img[loading="lazy"]')
    .evaluateAll((imgs) => imgs.forEach((i) => ((i as HTMLImageElement).loading = "eager")));
  await page.evaluate(() => window.scrollTo(0, 0));
};

const GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/;

/** Stubs Google requests; returns the requested URLs. */
export const recordGoogle = async (context: BrowserContext) => {
  const urls: string[] = [];
  await context.route(GOOGLE, (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  return urls;
};

/**
 * Serves the local build under PUBLIC_SITE_URL (where gtag.js may load); returns that origin.
 * `pageHeaders` are added to HTML responses, e.g. the hosting's Content-Security-Policy.
 */
export const asProductionDomain = async (
  context: BrowserContext,
  page: Page,
  baseURL: string,
  pageHeaders: Record<string, string> = {},
) => {
  await page.goto(localePath("ru"));
  const site = new URL((await page.locator("#consent-banner").getAttribute("data-site-url"))!);
  await context.route(`${site.origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    // Requests cancelled by navigation are fine.
    try {
      const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
      const isPage = route.request().resourceType() === "document";
      await route.fulfill({ response, headers: { ...response.headers(), ...(isPage ? pageHeaders : {}) } });
    } catch (error) {
      if (!/disposed|closed|already handled/i.test(String(error))) throw error;
    }
  });
  return site.origin;
};
