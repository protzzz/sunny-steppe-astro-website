import { expect, test } from "@playwright/test";
import {
  WHATSAPP,
  discoverPages,
  getDict,
  langOfPath,
  langSwitch,
  langs,
  localePath,
  settle,
  withoutLang,
} from "./helpers";

for (const lang of langs) {
  const t = getDict(lang);

  test.describe(`/${lang}`, () => {
    test("mobile menu opens, closes with Escape and has working links", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "the burger only exists on narrow screens");
      await page.goto(localePath(lang));
      await settle(page);

      const burger = page.getByRole("banner").getByRole("button", { name: t.ui.menu });
      const menu = page.getByTestId("mobile-menu");
      await expect(burger).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeHidden();

      await burger.click();
      await expect(burger).toHaveAttribute("aria-expanded", "true");
      await expect(menu).toBeVisible();

      await page.keyboard.press("Escape");
      await expect.soft(burger, "Escape closes the menu").toHaveAttribute("aria-expanded", "false");
      await expect.soft(menu, "Escape hides the menu").toBeHidden();

      if ((await burger.getAttribute("aria-expanded")) !== "true") await burger.click();
      await expect(menu).toBeVisible();

      const whatsapp = menu.getByRole("link", { name: t.ui.write });
      await expect.soft(whatsapp, "WhatsApp link inside the open menu").toBeVisible();
      if (await whatsapp.count()) await expect.soft(whatsapp).toHaveAttribute("href", WHATSAPP);

      await menu.getByRole("link", { name: t.nav.catalog, exact: true }).click();
      await expect(page).toHaveURL((url) => withoutLang(url.pathname) === "/catalog");
    });

    test("RU/KZ switch opens the same page in the other language, on every page", async ({
      page,
      request,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "the switch is the same link on every viewport");
      const pages = await discoverPages(request, lang);
      test.setTimeout(10_000 + pages.length * 5_000);
      const other = lang === "ru" ? "kz" : "ru";
      for (const pagePath of pages) {
        await test.step(pagePath, async () => {
          await page.goto(pagePath);
          await langSwitch(page, other).click();
          await expect(page).toHaveURL((url) => langOfPath(url.pathname) === other);
          expect.soft(withoutLang(new URL(page.url()).pathname), "same page").toBe(withoutLang(pagePath));
          await expect.soft(page.locator("html")).toHaveAttribute("lang", other === "kz" ? "kk" : "ru");
          // And back.
          await langSwitch(page, lang).click();
          await expect(page).toHaveURL((url) => langOfPath(url.pathname) === lang);
          expect.soft(new URL(page.url()).pathname, "back to the start page").toBe(pagePath);
        });
      }
    });

    test("the whole RU/KZ pill switches, even a click on the current language", async ({ page }) => {
      const other = lang === "ru" ? "kz" : "ru";
      await page.goto(localePath(lang, "/catalog"));
      await settle(page);
      const pill = langSwitch(page, other);
      const box = (await pill.boundingBox())!;
      // Click the current language's half (RU left, KZ right).
      await pill.click({ position: { x: box.width * (lang === "ru" ? 0.25 : 0.75), y: box.height / 2 } });
      await expect(page).toHaveURL(
        (url) => langOfPath(url.pathname) === other && withoutLang(url.pathname) === "/catalog",
      );
    });

    test("FAQ answer opens and closes", async ({ page }) => {
      await page.goto(localePath(lang, "/faq"));
      await settle(page);
      const question = page.getByRole("button", { name: t.faq.items[0].q });
      const answer = page.locator(`#${await question.getAttribute("aria-controls")}`);

      await expect(question).toHaveAttribute("aria-expanded", "false");
      await expect(answer).toBeHidden();
      await question.click();
      await expect(question).toHaveAttribute("aria-expanded", "true");
      await expect(answer).toBeVisible();
      await expect(answer.getByText(t.faq.items[0].a.slice(0, 30))).toBeVisible();
      await question.click();
      await expect(question).toHaveAttribute("aria-expanded", "false");
      await expect(answer).toBeHidden();
    });

    test("product pack turns around and back", async ({ page, request }) => {
      const products = (await discoverPages(request, lang)).filter((p) => withoutLang(p).startsWith("/product/"));
      expect(products.length).toBeGreaterThan(0);
      for (const product of products) {
        await test.step(product, async () => {
          await page.goto(product);
          await settle(page);
          const pack = page.getByTestId("product-pack");
          const turn = page.getByRole("button", { name: t.ui.rotate });
          await expect(pack).toHaveAttribute("style", /rotateY\(0deg\)/);
          await turn.click();
          await expect(pack).toHaveAttribute("style", /rotateY\(180deg\)/);
          const turnBack = page.getByRole("button", { name: t.ui.rotateBack });
          await expect(turnBack).toBeVisible();
          await turnBack.click();
          await expect(pack).toHaveAttribute("style", /rotateY\(0deg\)/);
        });
      }
    });

    test("sugar calculator reacts to the number of spoons", async ({ page }) => {
      await page.goto(localePath(lang));
      await settle(page);
      const slider = page.getByRole("slider");
      await slider.scrollIntoViewIfNeeded();
      const section = page.locator("section").filter({ has: slider });
      const before = await section.innerText();
      await slider.fill("8");
      // 1 spoon = 5 g
      await expect(section.getByText(`${8 * 5} ${t.calc.perDay}`).first()).toBeVisible();
      expect(await section.innerText()).not.toBe(before);
    });

    test("caffeine calculator reacts to + and −", async ({ page, request }) => {
      const products = (await discoverPages(request, lang)).filter((p) => withoutLang(p).startsWith("/product/"));
      let found = false;
      for (const product of products) {
        await page.goto(product);
        await settle(page);
        const heading = page.getByRole("heading", { name: t.gumCalc.title });
        if ((await heading.count()) === 0) continue;
        found = true;
        await heading.scrollIntoViewIfNeeded();
        const section = page.locator("section").filter({ has: heading });
        const caffeine = section.getByText(new RegExp(`^\\d+ ${t.gumCalc.mg}$`));
        const mg = async () => Number((await caffeine.innerText()).split(" ")[0]);
        const start = await mg();
        await section.getByRole("button", { name: "+", exact: true }).click();
        await expect.poll(mg).toBeGreaterThan(start);
        await section.getByRole("button", { name: "−", exact: true }).click();
        await expect.poll(mg).toBe(start);
      }
      expect(found, "a product page with the caffeine calculator").toBe(true);
    });
  });
}
