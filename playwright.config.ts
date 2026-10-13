import { defineConfig, devices } from "@playwright/test";
import { CONSENT_KEY, serializeConsent } from "./src/lib/analytics";

// Modes: default — production build via `astro preview`; E2E_MODE=dev — `astro dev` (local only);
// BASE_URL=… — an already running site. --ignore-lock: runs next to your own dev/preview server.
const mode = process.env.E2E_MODE === "dev" ? "dev" : "prod";
const port = mode === "dev" ? 4328 : 4329;
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

// Fake GA4 ID: the banner and events get tested, nothing is sent. E2E_PREBUILT=1 skips the build.
export const E2E_GA_ID = "G-TEST000000";
const prodCommand = `${process.env.E2E_PREBUILT ? "" : `PUBLIC_GA_ID=${E2E_GA_ID} npx astro build && `}npx astro preview --port ${port} --ignore-lock`;

// Analytics declined by default so the banner doesn't cover pages (analytics.spec.ts resets it).
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
