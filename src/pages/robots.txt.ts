import type { APIRoute } from "astro";
import { PUBLIC_NOINDEX } from "astro:env/client";

// Built from `site` (PUBLIC_SITE_URL), so the sitemap address follows the domain in .env.
// A test copy (PUBLIC_NOINDEX=true) closes the whole site to crawlers instead.
export const GET: APIRoute = ({ site }) =>
  new Response(
    PUBLIC_NOINDEX
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
