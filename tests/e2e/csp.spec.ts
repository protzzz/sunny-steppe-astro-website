import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { asProductionDomain, discoverPages, getDict, isDev, langs, recordGoogle, settle } from "./helpers";

// The Content-Security-Policy from public/.htaccess, applied to every page: nothing the site needs is blocked,
// GA4 included (loaded after consent on the production domain, stubbed here).
test.skip(isDev, "`astro dev` injects its own scripts");
test.skip(!!process.env.BASE_URL, "needs the local build under the production-domain stand-in");
test.use({ storageState: { cookies: [], origins: [] } });

const CSP = readFileSync("public/.htaccess", "utf-8").match(/Content-Security-Policy "([^"]+)"/)?.[1];

test("every page works under the hosting's Content-Security-Policy", async ({
  page,
  context,
  baseURL,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the policy is the same on every viewport");
  expect(CSP, "CSP in public/.htaccess").toBeTruthy();
  const google = await recordGoogle(context);
  const origin = await asProductionDomain(context, page, baseURL!, { "Content-Security-Policy": CSP! });
  await context.addInitScript(() => {
    const w = window as unknown as { cspViolations: string[] };
    w.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      w.cspViolations.push(`${e.violatedDirective}: ${e.blockedURI || "inline"}`),
    );
  });

  // Consent first, so gtag.js is requested on every page as well.
  const response = await page.goto(`${origin}/`);
  expect(response?.headers()["content-security-policy"], "CSP header is applied").toBe(CSP);
  await page.getByRole("button", { name: getDict("ru").consent.accept }).click();
  await expect.poll(() => google.some((u) => u.includes("/gtag/js"))).toBe(true);

  const pages = (await Promise.all(langs.map((lang) => discoverPages(request, lang)))).flat();
  test.setTimeout(20_000 + pages.length * 8_000);
  for (const path of pages) {
    await test.step(path, async () => {
      await page.goto(`${origin}${path}`);
      await settle(page); // islands hydrate only if their inline scripts are allowed
      expect
        .soft(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations))
        .toEqual([]);
    });
  }
});
