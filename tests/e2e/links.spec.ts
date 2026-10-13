import { expect, test } from "@playwright/test";
import {
  discoverPages,
  distPages,
  hasDist,
  htmlLang,
  langs,
  localePath,
  trailingSlash,
  warn,
  withoutLang,
} from "./helpers";

// Server-side checks: no page rendering needed, so they run once, in the desktop project.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "same server responses for every viewport");
});

test("every PDF link answers 200 with application/pdf", async ({ request }) => {
  const pdfs = new Set<string>();
  for (const lang of langs) {
    for (const page of await discoverPages(request, lang)) {
      const html = await (await request.get(page)).text();
      for (const [, href] of html.matchAll(/href="([^"]+\.pdf)"/g)) pdfs.add(href);
    }
  }
  expect(pdfs.size, "PDF links found").toBeGreaterThan(0);
  for (const pdf of pdfs) {
    const res = await request.get(pdf);
    expect.soft(res.status(), pdf).toBe(200);
    expect.soft(res.headers()["content-type"], pdf).toContain("application/pdf");
  }
});

test("internal links are served without a redirect", async ({ request }, testInfo) => {
  for (const lang of langs) {
    for (const page of await discoverPages(request, lang)) {
      const res = await request.get(page, { maxRedirects: 0 });
      expect.soft(res.status(), `${page} (trailingSlash: "${trailingSlash}")`).toBe(200);
    }
  }
  if (trailingSlash === "ignore") {
    warn(
      testInfo,
      'astro.config has no trailingSlash ("ignore"): link format is not enforced, set "always" or "never"',
    );
  }
});

test("/ is the Russian home page, /kz/ the Kazakh one", async ({ page }) => {
  for (const lang of langs) {
    const response = await page.goto(localePath(lang));
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname, "no redirect").toBe(localePath(lang));
    await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(lang));
  }
});

test("an unknown path answers 404 with the 404 page", async ({ page, request }) => {
  // In the site's own URL format: with trailingSlash "always", `astro preview` and `astro dev` answer a
  // path without the slash with their own notice page instead of ours.
  const missing = trailingSlash === "always" ? "/no-such-page-e2e/" : "/no-such-page-e2e";
  const res = await request.get(missing);
  expect(res.status()).toBe(404);
  await page.goto(missing);
  await expect(page.getByText("404", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("link crawl finds every built page", async ({ request }) => {
  test.skip(!hasDist, "needs the local production build in dist/");
  const crawled = new Set<string>();
  for (const lang of langs)
    for (const p of await discoverPages(request, lang))
      crawled.add(localePath(lang, withoutLang(p)).replace(/(.)\/$/, "$1"));
  // 404 is reached by mistake, not by a link.
  const built = distPages().filter((p) => p !== "/404");
  expect(
    built.filter((p) => !crawled.has(p)),
    "built pages no link leads to",
  ).toEqual([]);
});
