// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

import sitemap from "@astrojs/sitemap";

// Astro loads .env after the config, so read it here. Env variables win over the file.
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
if (!PUBLIC_SITE_URL) {
  throw new Error("PUBLIC_SITE_URL is not set: copy .env.example to .env (or set it in CI / on the hosting).");
}
// Bare https origin only: it goes into canonical, sitemap and the GA4 domain check.
{
  const url = URL.canParse(PUBLIC_SITE_URL) ? new URL(PUBLIC_SITE_URL) : null;
  if (!url || url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `PUBLIC_SITE_URL must be a bare https:// address like https://sunnysteppe.kz, got "${PUBLIC_SITE_URL}"`,
    );
  }
}

// https://astro.build/config
export default defineConfig({
  // Base for canonical, hreflang, og, sitemap and robots.txt.
  site: PUBLIC_SITE_URL,
  // Pages are folders (/about/index.html), so URLs end with "/". Without it astro dev answers 404.
  trailingSlash: "always",
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({ context: "client", access: "public", url: true }),
      // GA4 ID (G-…). Empty: no analytics, no banner. Set only on the hosting.
      PUBLIC_GA_ID: envField.string({ context: "client", access: "public", optional: true }),
      // true for a test copy: noindex everywhere, "Disallow: /" in robots.txt. Never in production.
      PUBLIC_NOINDEX: envField.boolean({ context: "client", access: "public", default: false }),
    },
  },
  i18n: {
    locales: ["ru", "kz"],
    defaultLocale: "ru",
    // Russian at the root, Kazakh under /kz/ (src/pages/[...lang]/, see langPaths()).
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // Fonts are self-hosted, only the weights in use. Kazakh letters (ә, ғ, қ…) come from the
  // fallback font, so optimizedFallbacks stays off: it would resize them.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Playfair Display",
      cssVariable: "--font-playfair",
      weights: [400, 500, 600],
      styles: ["normal", "italic"],
      subsets: ["cyrillic", "latin"],
      fallbacks: ["serif"],
      optimizedFallbacks: false,
    },
    {
      provider: fontProviders.google(),
      name: "Manrope",
      cssVariable: "--font-manrope",
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["cyrillic", "latin"],
      fallbacks: ["system-ui", "sans-serif"],
      optimizedFallbacks: false,
    },
  ],
  vite: {
    // Separate Vite cache for dev: a shared one breaks islands with "_jsxDEV is not a function".
    cacheDir: process.argv.includes("dev") ? "node_modules/.vite" : "node_modules/.vite-cli",
    plugins: [tailwindcss()],
  },
  integrations: [react(), sitemap()],
});
