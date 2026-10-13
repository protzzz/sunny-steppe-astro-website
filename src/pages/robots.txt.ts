import type { APIRoute } from "astro";
import { PUBLIC_NOINDEX } from "astro:env/client";

// Sitemap URL from PUBLIC_SITE_URL. PUBLIC_NOINDEX=true closes the site.
export const GET: APIRoute = ({ site }) =>
  new Response(
    PUBLIC_NOINDEX
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
