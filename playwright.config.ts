import { defineConfig, devices } from "@playwright/test";
import { CONSENT_KEY, serializeConsent } from "./src/lib/analytics";

// Three ways to run:
// - default: production build served by `astro preview` (what CI and visitors get);
// - E2E_MODE=dev: `astro dev`, for local checks only — some bugs (e.g. a broken React
//   pre-bundle) show up only on the dev server;
// - BASE_URL=https://…: test an already running site, no server is started.
// Ports differ from the defaults, and --ignore-lock lets the tests start their own server even
// when `astro dev --background` / `astro preview --background` is already running.
const mode = process.env.E2E_MODE === "dev" ? "dev" : "prod";
const port = mode === "dev" ? 4328 : 4329;
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

// The site is built with a fake GA4 ID, never the real one from .env: the consent banner and the
// event code are then part of the build and get tested, while gtag.js is only ever requested on the
// real domain, which the tests never open (see tests/e2e/analytics.spec.ts).
// `npm test` builds once (with the same ID) and sets E2E_PREBUILT=1, so the site isn't built twice.
export const E2E_GA_ID = "G-TEST000000";
const prodCommand = `${process.env.E2E_PREBUILT ? "" : `PUBLIC_GA_ID=${E2E_GA_ID} npx astro build && `}npx astro preview --port ${port} --ignore-lock`;

// Every test starts with analytics declined, so the consent banner does not cover the page.
// analytics.spec.ts starts from an empty storage to test the banner itself.
const declined = {
  cookies: [],
  origins: [
    {
      origin: new URL(baseURL).origin,
      localStorage: [{ name: CONSENT_KEY, value: serializeConsent("denied", Date.now()) }],
    },
  ],
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [[process.env.CI ? "github" : "list"], ["html", { open: "never" }], ["./tests/e2e/warnings-reporter.ts"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    contextOptions: { reducedMotion: "reduce" },
    storageState: declined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: mode === "dev" ? `npx astro dev --port ${port} --ignore-lock` : prodCommand,
        url: `${baseURL}/`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
