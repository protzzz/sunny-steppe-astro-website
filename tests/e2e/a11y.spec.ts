import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { discoverPages, langs, settle } from "./helpers";

// Every page, not only the home pages: colours and components differ from page to page.
// Only serious and critical violations fail the run.
for (const lang of langs) {
  test(`every /${lang} page has no serious or critical accessibility violations`, async ({ page, request }) => {
    const pages = await discoverPages(request, lang);
    test.setTimeout(20_000 + pages.length * 10_000);
    for (const pagePath of pages) {
      await test.step(pagePath, async () => {
        await page.goto(pagePath);
        await settle(page);
        const { violations } = await new AxeBuilder({ page }).analyze();
        const blocking = violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(" ")})`);
        expect.soft(blocking, pagePath).toEqual([]);
      });
    }
  });
}
