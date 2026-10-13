import { expect, test } from "@playwright/test";
import {
  WHATSAPP,
  discoverPages,
  getDict,
  htmlLang,
  isDev,
  isPageLink,
  langOfPath,
  langSwitch,
  langs,
  matchesTrailingSlash,
  settle,
  trailingSlash,
  warn,
  withoutLang,
  type Lang,
} from "./helpers";

// Dev-only console errors to ignore: HMR socket lost when the dev server restarts.
const DEV_CONSOLE_ALLOWLIST: RegExp[] = [/\[vite\] (failed to connect to websocket|server connection lost)/i];

/** E2E_STRICT_TODO=1: fail on "TODO" in Kazakh pages instead of warning. */
const STRICT_TODO = !!process.env.E2E_STRICT_TODO;

for (const lang of langs) {
  test(`every /${lang} page passes the basic checks`, async ({ page, request }, testInfo) => {
    const pages = await discoverPages(request, lang);
    test.setTimeout(20_000 + pages.length * 15_000);
    const t = getDict(lang);
    const other: Lang = lang === "ru" ? "kz" : "ru";

    let errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      if (isDev && DEV_CONSOLE_ALLOWLIST.some((re) => re.test(msg.text()))) return;
      errors.push(`console.error: ${msg.text()}`);
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
    page.on("response", (res) => {
      if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    // Analytics is declined here (playwright.config.ts).
    page.on("request", (req) => {
      if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(req.url())) {
        errors.push(`request to Google Analytics: ${req.url()}`);
      }
    });

    expect(pages.length, "pages found by following links").toBeGreaterThan(5);

    for (const pagePath of pages) {
      await test.step(pagePath, async () => {
        errors = [];
        const response = await page.goto(pagePath);
        expect.soft(response?.status(), "status").toBe(200);
        await settle(page);

        // Language, title, description.
        await expect.soft(page.locator("html")).toHaveAttribute("lang", htmlLang(lang));
        expect.soft(await page.title(), "<title>").toMatch(/\S/);
        if (withoutLang(pagePath) === "/") expect.soft(await page.title()).toBe(t.meta.home);
        await expect.soft(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);

        // Header and images.
        await expect.soft(page.getByRole("banner")).toBeVisible();
        await expect
          .configure({ soft: true })
          .poll(
            () =>
              page
                .locator("img")
                .evaluateAll((imgs) =>
                  (imgs as HTMLImageElement[])
                    .filter((i) => !(i.complete && i.naturalWidth > 0))
                    .map((i) => i.currentSrc || i.src),
                ),
            { message: "images that did not load" },
          )
          .toEqual([]);
        const noAlt = await page
          .locator("img:not([alt])")
          .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
        expect.soft(noAlt, "images without alt").toEqual([]);

        // Horizontal overflow; body has overflow-x: hidden, so check it too.
        const overflow = await page.evaluate(() => ({
          html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.body.scrollWidth - document.body.clientWidth,
        }));
        expect.soft(overflow, "horizontal overflow, px").toEqual({ html: 0, body: 0 });

        // Placeholders and broken values in visible text.
        const text = await page.locator("body").innerText();
        for (const bad of ["{phone}", "{", "[object Object]"])
          expect.soft(text, `text contains "${bad}"`).not.toContain(bad);
        expect.soft(text, 'text contains "undefined"').not.toMatch(/\bundefined\b/);
        expect.soft(text, 'text contains "NaN"').not.toMatch(/\bNaN\b/);

        // Links: trailing slash, WhatsApp format, rel. Skips the dev toolbar (shadow root).
        const links = await page.locator("a[href]").evaluateAll((as) =>
          (as as HTMLAnchorElement[])
            .filter((a) => a.getRootNode() === document)
            .map((a) => ({
              href: a.getAttribute("href")!,
              target: a.target,
              rel: a.rel,
            })),
        );
        const badSlash = links.filter((l) => isPageLink(l.href) && !matchesTrailingSlash(l.href)).map((l) => l.href);
        expect.soft(badSlash, `links not in trailingSlash: "${trailingSlash}" format`).toEqual([]);
        const badWhatsApp = links.filter((l) => /wa\.me|whatsapp/i.test(l.href) && !WHATSAPP.test(l.href));
        expect.soft(badWhatsApp, "malformed WhatsApp links").toEqual([]);
        const unsafeBlank = links.filter((l) => l.target === "_blank" && !/\bnoopener\b/.test(l.rel));
        expect.soft(unsafeBlank, 'target="_blank" without rel="noopener"').toEqual([]);

        // RU/KZ switch keeps the page.
        const switchLink = langSwitch(page, other);
        const switchHref = (await switchLink.getAttribute("href")) ?? "";
        expect.soft(langOfPath(switchHref), `switch link ${switchHref} goes to the ${other} version`).toBe(other);
        expect.soft(withoutLang(switchHref), "switch link keeps the page").toBe(withoutLang(pagePath));

        // TODO on Kazakh pages.
        if (lang === "kz") {
          const todos = text.split("\n").filter((line) => line.includes("TODO"));
          if (todos.length > 0) {
            warn(testInfo, `${pagePath}: ${todos.length} line(s) with "TODO"`);
            if (STRICT_TODO) expect.soft(todos, "TODO on a Kazakh page").toEqual([]);
          }
        }

        expect.soft(errors, "console errors and failed requests").toEqual([]);
      });
    }
  });
}
