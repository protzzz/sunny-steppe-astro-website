// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

import sitemap from "@astrojs/sitemap";

// The config is read before Astro loads .env, so read it here. Process variables (CI) win over the file.
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
if (!PUBLIC_SITE_URL) {
  throw new Error("PUBLIC_SITE_URL is not set: copy .env.example to .env (or set it in CI / on the hosting).");
}
// Only the bare https origin: a path, an http:// address or a preview domain would end up in every
// canonical link, the sitemap and the GA4 domain check. (Which domain is right is printed by check-build.)
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
  // Canonical, hreflang, og:url, og:image, the sitemap and robots.txt are all built from this.
  site: PUBLIC_SITE_URL,
  // Pages are built as folders (/about/index.html, /kz/about/index.html), so their real URL ends with "/". Links,
  // canonical and sitemap use that form, and `astro dev` answers 404 without it — like most hosts would
  // answer with a redirect.
  trailingSlash: "always",
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({ context: "client", access: "public", url: true }),
      // Google Analytics 4 Measurement ID (G-…). Empty: no analytics, no consent banner. Set it only in
      // the hosting's production build; format and the production-only rule are in src/lib/analytics.ts.
      PUBLIC_GA_ID: envField.string({ context: "client", access: "public", optional: true }),
      // A test copy of the site (another domain or folder): true keeps it out of search engines —
      // noindex on every page and "Disallow: /" in robots.txt. Never set it in the production build.
      PUBLIC_NOINDEX: envField.boolean({ context: "client", access: "public", default: false }),
    },
  },
  i18n: {
    locales: ["ru", "kz"],
    defaultLocale: "ru",
    // Russian (the default) lives at the root, Kazakh under /kz/. The pages are src/pages/[...lang]/,
    // where an empty `lang` is Russian (see langPaths() in src/i18n/index.ts).
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // Fonts are downloaded at build time and served from our own domain, so the first
  // render no longer waits on fonts.googleapis.com. Only the weights in use are listed.
  // Neither font has the Kazakh letters (ә, ғ, қ, ң, ө, ұ, ү, һ), so the browser draws them
  // from the fallback. Metric-adjusted fallbacks would scale those letters to the wrong
  // size, hence optimizedFallbacks: false and the same plain stacks as before.
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
    // `astro check` and `astro build` pre-bundle React in production mode into Vite's cache.
    // Sharing that folder with a running `astro dev` swaps the dev server's React for the
    // production one, and every island (header, product viewer…) crashes in the browser with
    // "_jsxDEV is not a function". Only the dev server uses the default cache; every other
    // command gets its own.
    cacheDir: process.argv.includes("dev") ? "node_modules/.vite" : "node_modules/.vite-cli",
    plugins: [tailwindcss()],
  },
  integrations: [react(), sitemap()],
});
