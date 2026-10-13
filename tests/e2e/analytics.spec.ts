import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { CONSENT_KEY } from "../../src/lib/analytics";
import { getDict, isDev, localePath } from "./helpers";

// Google Analytics with basic Consent Mode. The build carries a fake ID (playwright.config.ts).
// Nothing here reaches Google: every request to it is answered locally and recorded, so the tests
// can prove when gtag.js would load. gtag.js itself never runs; the events are read from dataLayer.
test.skip(isDev, "`astro dev` builds without analytics");
test.skip(!!process.env.BASE_URL, "tests the local build: it needs the fake GA ID and the production-domain stand-in");

// No stored choice: the visitor sees the banner.
test.use({ storageState: { cookies: [], origins: [] } });

const t = getDict("ru");
const GOOGLE = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/;

/** Answers every request to Google locally and returns the list of requested URLs. */
const recordGoogle = async (context: BrowserContext) => {
  const urls: string[] = [];
  await context.route(GOOGLE, (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  return urls;
};

/** WhatsApp and Instagram open instantly and offline. */
const stubExternalSites = (context: BrowserContext) =>
  context.route(/wa\.me|instagram\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }),
  );

/**
 * Serves the local build under the real domain (PUBLIC_SITE_URL), the only host where gtag.js may load.
 * Returns that origin; pages are then opened with `${origin}/…`.
 */
const asProductionDomain = async (context: BrowserContext, page: Page, baseURL: string) => {
  await page.goto(localePath("ru"));
  const site = new URL((await page.locator("#consent-banner").getAttribute("data-site-url"))!);
  await context.route(`${site.origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    // A request can be cancelled midway when the test navigates on; that is not a failure.
    try {
      const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
      await route.fulfill({ response });
    } catch (error) {
      if (!/disposed|closed|already handled/i.test(String(error))) throw error;
    }
  });
  return site.origin;
};

type Entry = unknown[];
const dataLayer = (page: Page): Promise<Entry[] | null> =>
  page.evaluate(() => {
    const dl = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer;
    return dl ? dl.map((e) => Array.from(e).map((v) => (v instanceof Date ? "date" : v))) : null;
  });
const events = async (page: Page) =>
  ((await dataLayer(page)) ?? [])
    .filter((e) => e[0] === "event")
    .map((e) => ({ name: e[1] as string, ...(e[2] as Record<string, string>) }));
const gtagLoads = (urls: string[]) => urls.filter((u) => u.includes("/gtag/js"));

const banner = (page: Page) => page.getByRole("region", { name: t.consent.label });

test("before consent nothing is loaded or sent, and the links still open", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "link positions differ on mobile; the mobile banner has its own test");
  const google = await recordGoogle(context);
  await stubExternalSites(context);
  const origin = await asProductionDomain(context, page, baseURL!);

  await page.goto(`${origin}/`);
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole("button", { name: t.consent.accept })).toBeVisible();
  await expect(banner(page).getByRole("button", { name: t.consent.decline })).toBeVisible();

  // WhatsApp, Instagram and a PDF open while the banner is still unanswered.
  const opens = async (click: () => Promise<void>, url: RegExp) => {
    const [popup] = await Promise.all([context.waitForEvent("page"), click()]);
    await expect(popup).toHaveURL(url);
    await popup.close();
  };
  await opens(() => page.locator('[data-track-location="hero"]').click(), /wa\.me/);
  await opens(
    () =>
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: /@sunnysteppe/ })
        .click(),
    /instagram\.com/,
  );
  await page.goto(`${origin}/documents/`);
  // Headless Chromium downloads a PDF instead of showing it, so check that the PDF was requested.
  await Promise.all([
    context.waitForEvent("request", (req) => /\.pdf$/.test(req.url())),
    page.getByRole("link", { name: t.docs.open }).first().click(),
  ]);

  expect(google, "requests to Google before consent").toEqual([]);
  expect(await dataLayer(page), "dataLayer before consent").toBeNull();
  expect((await context.cookies()).filter((c) => c.name.startsWith("_ga"))).toEqual([]);
});

test("accepting on the real domain loads GA and sends the three events", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop link positions");
  const google = await recordGoogle(context);
  await stubExternalSites(context);
  const origin = await asProductionDomain(context, page, baseURL!);

  await page.goto(`${origin}/`);
  const gaId = await page.locator("#consent-banner").getAttribute("data-ga-id");
  expect(google).toEqual([]);
  await banner(page).getByRole("button", { name: t.consent.accept }).click();
  await expect(banner(page)).toBeHidden();

  await expect.poll(() => gtagLoads(google)).toEqual([`https://www.googletagmanager.com/gtag/js?id=${gaId}`]);
  const setup = (await dataLayer(page))!;
  expect(setup).toContainEqual(["consent", "default", expect.objectContaining({ analytics_storage: "denied" })]);
  expect(setup).toContainEqual([
    "consent",
    "update",
    expect.objectContaining({ analytics_storage: "granted", ad_storage: "denied" }),
  ]);
  expect(setup).toContainEqual(["config", gaId]);

  // Header WhatsApp (desktop): the click is reported and the chat still opens.
  const [chat] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("banner").getByRole("link", { name: t.ui.write }).click(),
  ]);
  await chat.close();
  await expect
    .poll(() => events(page))
    .toContainEqual(expect.objectContaining({ name: "whatsapp_click", link_location: "header", lang: "ru" }));

  // Footer Instagram.
  const [insta] = await Promise.all([
    context.waitForEvent("page"),
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: /@sunnysteppe/ })
      .click(),
  ]);
  await insta.close();
  await expect
    .poll(() => events(page))
    .toContainEqual(expect.objectContaining({ name: "instagram_click", link_location: "footer" }));

  // Product page: the stored consent loads GA straight away; events carry the product.
  await page.goto(`${origin}/product/gum/`);
  await expect.poll(() => gtagLoads(google).length).toBe(2);
  const [order] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-track-location="product"]').click(),
  ]);
  await order.close();
  const [pdf] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: t.docs.open }).click(),
  ]);
  await pdf.close();
  await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: t.docs.download }).click()]);
  const productEvents = await events(page);
  expect(productEvents).toContainEqual(
    expect.objectContaining({ name: "whatsapp_click", link_location: "product", product: "gum" }),
  );
  expect(productEvents).toContainEqual(
    expect.objectContaining({
      name: "pdf_download",
      product: "gum",
      link_type: "open",
      file_name: expect.stringMatching(/\.pdf$/),
    }),
  );
  expect(productEvents).toContainEqual(
    expect.objectContaining({ name: "pdf_download", product: "gum", link_type: "download" }),
  );

  // Kazakh pages report their language.
  await page.goto(`${origin}/kz/`);
  const [kzChat] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-track-location="hero"]').click(),
  ]);
  await kzChat.close();
  await expect
    .poll(() => events(page))
    .toContainEqual(expect.objectContaining({ name: "whatsapp_click", link_location: "hero", lang: "kz" }));
});

test("on localhost the events are queued but nothing is requested from Google", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one viewport is enough");
  const google = await recordGoogle(context);
  await stubExternalSites(context);
  await page.goto(localePath("ru"));
  await banner(page).getByRole("button", { name: t.consent.accept }).click();
  const [chat] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-track-location="hero"]').click(),
  ]);
  await chat.close();
  await expect.poll(() => events(page)).toContainEqual(expect.objectContaining({ name: "whatsapp_click" }));
  expect(google, "requests to Google from localhost").toEqual([]);
});

test("withdrawing consent stops tracking and removes the GA cookies", async ({ page, context, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one viewport is enough");
  const google = await recordGoogle(context);
  await stubExternalSites(context);
  const origin = await asProductionDomain(context, page, baseURL!);

  await page.goto(`${origin}/`);
  const gaId = (await page.locator("#consent-banner").getAttribute("data-ga-id"))!;
  await banner(page).getByRole("button", { name: t.consent.accept }).click();
  await expect.poll(() => gtagLoads(google).length).toBe(1);
  // What gtag.js would have set (it is stubbed here).
  await page.evaluate((id) => {
    document.cookie = "_ga=GA1.1.123.456; path=/";
    document.cookie = `_ga_${id.replace(/^G-/, "")}=GS1.1.789; path=/`;
  }, gaId);

  // "Cookie settings" in the footer reopens the banner with the focus on its first button.
  await page.getByRole("button", { name: t.footer.cookieSettings }).click();
  await expect(banner(page)).toBeVisible();
  await expect(banner(page).getByRole("button", { name: t.consent.accept })).toBeFocused();
  await banner(page).getByRole("button", { name: t.consent.decline }).click();
  await expect(banner(page)).toBeHidden();

  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY))!).value).toBe("denied");
  expect(await page.evaluate((id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`], gaId)).toBe(
    true,
  );
  expect((await dataLayer(page))!.at(-1)).toEqual([
    "consent",
    "update",
    expect.objectContaining({ analytics_storage: "denied" }),
  ]);
  expect(
    (await context.cookies()).filter((c) => c.name.startsWith("_ga")),
    "GA cookies after withdrawal",
  ).toEqual([]);

  // Clicks are no longer reported, and the next page does not load GA.
  const before = (await events(page)).length;
  const [chat] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-track-location="hero"]').click(),
  ]);
  await chat.close();
  expect((await events(page)).length).toBe(before);
  await page.goto(`${origin}/catalog/`);
  await expect(banner(page)).toBeHidden();
  expect(gtagLoads(google).length, "gtag.js loads after withdrawal").toBe(1);
  expect(await dataLayer(page)).toBeNull();
});

test("declining first and accepting later in the settings turns analytics on", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one viewport is enough");
  const google = await recordGoogle(context);
  const origin = await asProductionDomain(context, page, baseURL!);

  await page.goto(`${origin}/`);
  await banner(page).getByRole("button", { name: t.consent.decline }).click();
  await page.goto(`${origin}/faq/`);
  await expect(banner(page)).toBeHidden();
  expect(google).toEqual([]);

  await page.getByRole("button", { name: t.footer.cookieSettings }).click();
  await banner(page).getByRole("button", { name: t.consent.accept }).click();
  await expect.poll(() => gtagLoads(google).length).toBe(1);
});

test("mobile: the banner fits the screen and the menu's WhatsApp is reported as 'menu'", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile layout");
  await recordGoogle(context);
  await stubExternalSites(context);
  const origin = await asProductionDomain(context, page, baseURL!);
  const tk = getDict("kz");

  await page.goto(`${origin}/kz/`);
  const kzBanner = page.getByRole("region", { name: tk.consent.label });
  await expect(kzBanner).toBeVisible();
  const box = (await kzBanner.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await kzBanner.getByRole("button", { name: tk.consent.accept }).click();

  await page.getByRole("banner").getByRole("button", { name: tk.ui.menu }).click();
  const [chat] = await Promise.all([
    context.waitForEvent("page"),
    page.getByTestId("mobile-menu").getByRole("link", { name: tk.ui.write }).click(),
  ]);
  await chat.close();
  await expect
    .poll(() => events(page))
    .toContainEqual(expect.objectContaining({ name: "whatsapp_click", link_location: "menu", lang: "kz" }));
});

test("the consent banner has no serious accessibility violations", async ({ page }) => {
  await page.goto(localePath("ru"));
  await expect(banner(page)).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include("#consent-banner").analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
