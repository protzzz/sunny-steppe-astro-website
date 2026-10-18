# Sunny Steppe — website

A showcase website for a Kazakhstani brand of xylitol-based sweets (Lollipop candies with DHA, Energy Gum,
100% xylitol). Nothing is sold on the site: all orders go through WhatsApp. Two languages: Russian (at the site
root, no prefix) and Kazakh (`/kz/`). Domain: https://sunnysteppe.kz.

Stack: Astro 7 (static build), React 19 (only for interactive islands), Tailwind CSS 4, TypeScript (strict).

> `CLAUDE.md` is a symlink to this file (`AGENTS.md`). Edit `AGENTS.md`.
>
> Documentation and code comments are in English. Visitor-facing copy is in Russian and Kazakh.

## Commands

| Command                    | What it does                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- |
| `astro dev --background`   | Dev server in the background. Manage it with `astro dev stop / status / logs` |
| `npm run build`            | `astro check` → `astro build` → `scripts/check-build.mjs`                     |
| `npm run check`            | Type checks only: `astro check` and `tsc --noEmit`                            |
| `npm run lint`             | ESLint (`eslint-plugin-astro`)                                                |
| `npm run format`           | Prettier (with the Astro plugin and Tailwind class sorting)                   |
| `npm run format:check`     | The same check CI runs                                                        |
| `npm run preview`          | Serve the built `dist/` locally                                               |
| `npm run icons`            | Regenerate the site icons from `src/assets/logo-mark.png`                     |
| `npm run test:unit`        | Vitest (`tests/unit`)                                                         |
| `npm run test:e2e`         | Playwright (`tests/e2e`) on the build, desktop + mobile                       |
| `npm run test:e2e:running` | Playwright on the dev server already running at `localhost:4321`              |
| `npm test`                 | Unit tests → build → Playwright, as in CI                                     |

**Before calling a task done**, run `npm run format:check && npm run lint && npm test`. These are the same steps
CI runs (`.github/workflows/ci.yml`). If the browser is missing, run `npx playwright install chromium` first.
If a task changes logic or interaction, add or update a test. The e2e tests find pages by crawling links,
so there is no list of pages to maintain.

After changing `tsconfig.json`, `astro.config.mjs` or `.env`, restart a running dev server
(`astro dev stop`, then `astro dev --background`): it does not pick up new aliases or settings.
On a fresh clone `tsc` needs Astro's generated types first: run `npx astro sync` (or `npm run check`).

`scripts/check-build.mjs` checks the built `dist/` and fails the build if:

- an internal link (`href`, `src`, `srcset`, `og:image`) points to a missing file;
- Russian text is left on a `/kz` page. This is how a key missing from `kz.ts` shows up: without a translation,
  the Russian text is used;
- `gtag.js` is loaded directly in the page HTML;
- an absolute URL (canonical, hreflang, Open Graph, sitemap, `robots.txt`, JSON-LD) is not on `PUBLIC_SITE_URL`.

If the check flags a word that is actually Kazakh (a term or a name), do not disable the check. Add the word
to the right list at the top of the script and note where it comes from.

## Structure

```text
src/
  pages/
    [...lang]/            every page, one file for both languages (getStaticPaths = langPaths): empty lang is Russian, kz is Kazakh
      product/[id].astro  product page, generated from data/products.ts
    og/[name].jpg.ts      1200×630 share images (site + one per product), built with sharp
    robots.txt.ts         robots.txt from PUBLIC_SITE_URL (Disallow: / when PUBLIC_NOINDEX=true)
    404.astro             the only page outside [...lang]; bilingual text right in the template
  layouts/Default.astro   <head> (SEO, hreflang, OG, JSON-LD, icons, fonts), header, footer, cookie banner
  components/             .astro: static; .tsx: React islands; ConsentBanner.astro: GA4 consent
  data/
    contacts.ts           phone, WhatsApp, Instagram, email, delivery terms
    products.ts           products: Russian copy + Kazakh overrides, images, colours
    documents.ts          EAEU declarations (PDFs in public/docs/)
    navigation.ts         menu items
  i18n/
    ru.ts                 main dictionary; its shape defines the Dictionary type
    kz.ts                 partial dictionary (PartialDictionary), merged over ru
    build.ts              merges kz over ru and fills the contact placeholders (unit-tested)
    index.ts              getDict(), localePath(), langPaths(), langNames
    plural.ts             Russian plural forms
  lib/
    analytics.ts          GA4 logic without DOM: link events, consent storage, domain check
    structured-data.ts    schema.org Organization + WebSite
  assets/                 logo and pack shots, optimised by Astro (AVIF/WebP)
  styles/global.css       Tailwind @theme: colours, breakpoints, animations, utilities
public/
  docs/                   declaration PDFs
  favicon.ico, apple-touch-icon.png, icon-192.png   generated by npm run icons
  site.webmanifest        web app manifest (name, colours, icon)
  .htaccess               security headers and caching for the hosting
scripts/                  build check, icon generator, Kazakh word list
tests/unit, tests/e2e     Vitest and Playwright (+ axe-core for accessibility)
.github/
  workflows/ci.yml        CI: the same checks as npm test
  dependabot.yml          dependency updates (TypeScript 7 skipped for now)
  screenshots/            screenshots for the README
docs/content-audit.md     copy audit: the source of every sentence (local only, git-ignored)
```

Import aliases: `@components/*`, `@layouts/*`, `@data/*`, `@i18n/*`, `@assets/*`, `@lib/*`.

## Copy and languages

- **No text in templates.** Everything a visitor sees lives in `src/i18n/ru.ts` + `kz.ts`, and product copy
  in `src/data/products.ts`. The only exception is `404.astro`.
- Add every new key **to both** files. If the client has not provided a translation, write your own Kazakh
  and mark it with `// TODO-перевод` (keep this exact marker: it is used to find texts for the translator;
  add what to check if useful).
- Contacts and delivery terms are **never typed into the copy**. Use the placeholders `{phone}`,
  `{deliveryCarriers}`, `{deliveryCarrierList}`, `{deliveryPickup}`, `{deliveryTerms}`, `{deliveryTermsShort}`:
  `i18n/build.ts` fills them from `data/contacts.ts`. To change the phone or the terms, edit only `contacts.ts`.
- Kazakh uses `kz` in URLs, but `kk` (the ISO code) in `<html lang>` and `hreflang`. This is intentional.
- Build links only with `localePath(lang, '/route')`, never by concatenating strings. It adds the trailing `/`:
  the config has `trailingSlash: "always"`, and `astro dev` answers 404 without it.
- Never hard-code the site address: it is `PUBLIC_SITE_URL` (`.env`), and `Astro.site` in code.
- Every environment variable is described in `.env.example` and in `env.schema` in `astro.config.mjs`. Add new ones
  to both. **Never** prefix secrets (`FTP_*`, any passwords) with `PUBLIC_`: such values end up in the HTML.

### Source of truth for content

The site sells food products, so **do not invent facts, promises or health claims**.
Every sentence must rely on one of these sources:

- the owners' documents: `../assets/text/ru/*.docx`, `../assets/text/kz/*.docx`;
- contacts: `../assets/base-info.txt`;
- packaging and print layouts: `../assets/item-images/`, `../assets/cover/`;
- EAEU declarations: `public/docs/*.pdf`;
- the design mock-up: `../design/`.

Before editing copy, check `docs/content-audit.md`. It lists what the owners asked to keep as is (⏸: the slogan,
Energy Gum composition and carbohydrates, geography, the "Coming soon" block, etc.) and which questions to them
are still open. Statements about health (blood sugar, teeth, brain, diabetes) must be neutral and sourced.
When in doubt, ask instead of writing something.

## Components and styles

- Write components in `.astro` by default. Use React (`.tsx`) only where there is state or interaction:
  the header with the burger menu, the 3D pack viewer, the calculators, the FAQ. Pick the laziest directive that
  works: `client:visible` below the first screen, `client:idle` for the header and the FAQ, `client:load` only
  for the pack viewer on product pages.
- React islands receive copy as props (`t={t.calc}`) instead of importing the dictionary.
- Images for an island are prepared on the server with `getImage()` and passed as URLs
  (see `Default.astro` → logo, `product/[id].astro` → `viewerImage`).
- Style only with Tailwind classes. Use the colour tokens from `global.css` (`navy`, `gold`, `gold-ink`, `honey`,
  `cream`, `paper`, `lead`, `muted`…); do not add new hex codes to markup. `gold` is for borders and accents only;
  text uses `gold-ink` (or `gold-deep` for large text) to keep WCAG AA contrast. The `nav` (1100px) and `wide`
  (1240px) breakpoints control the header. Utilities: `container`, `cards-3`.
- Fonts (Playfair Display, Manrope) come from the Fonts API in `astro.config.mjs` and are served from our domain.
  They lack the Kazakh letters (ә, ғ, қ, ң, ө, ұ, ү, һ), which the browser draws with the fallback font.
  That is why `optimizedFallbacks: false` is set; do not turn it on.

## Images

- Source files are in `raw-assets/` and are **not in git**.
- `src/assets/products/` holds the final pack shots (`<id>-front.webp`, `<id>-back.webp`). Astro resizes them
  to the needed AVIF/WebP sizes.
- Share images (`og:image`, 1200×630) are built on every build by `src/pages/og/[name].jpg.ts`: logo and packs
  on a cream background, no text. `/og/site.jpg` is used on every page, `/og/<id>.jpg` on product pages
  (the layout receives `ogImage={p.id}`). A new product gets its image automatically.
- Site icons are generated by `npm run icons`. There is no 512 px icon because the logo is only 213 px wide;
  add one when a vector or larger logo is available.

## Analytics and security

- Google Analytics 4 is wired only through `ConsentBanner.astro` and loads only after consent, only in a
  production build with `PUBLIC_GA_ID`, and only on the `PUBLIC_SITE_URL` domain. Never add `gtag.js` to
  `<head>` directly (`check-build.mjs` rejects it).
- `public/.htaccess` holds the Content-Security-Policy. If you add an external script, font, image or
  analytics endpoint, update the CSP: `tests/e2e/csp.spec.ts` fails on any violation.

## Common tasks

**New page**

1. Create `src/pages/[...lang]/<name>.astro` with `export const getStaticPaths = langPaths;` and
   `const lang = langFromParam(Astro.params.lang);`, wrapped in `<Default>`.
2. Add the `meta.<name>` title and the copy to `ru.ts` and `kz.ts`.
3. If the page belongs in the menu, add it to `routes` in `data/navigation.ts` and its label to `nav` in both
   dictionaries.

**New product**

1. Add the `id` to the `Product` union and an object to `products`. Kazakh copy goes into the `kz` object
   in the same file.
2. Put `<id>-front.webp` / `<id>-back.webp` into `src/assets/products/`. The share image is generated automatically.
3. If there is a declaration, put the PDF into `public/docs/` and add an entry to `data/documents.ts`.
   The product page, the cards and the Documents page pick it up automatically.

**Contacts or delivery changed:** edit only `src/data/contacts.ts`.

**The client's Kazakh translation changed:** run `node scripts/extract-kz-words.mjs`, then `npm run build`.

## Pitfalls

- **Do not remove `vite.cacheDir` from `astro.config.mjs`.** `astro check` and `astro build` put a production build
  of React into Vite's cache. If that cache is shared with a running `astro dev`, every island crashes in the
  browser with `_jsxDEV is not a function`. If it happens anyway, stop the dev server, delete `node_modules/.vite`
  and start it again.
- Russian lives at the root (`/`, `/catalog/`), Kazakh under `/kz/`. There is no `/ru` prefix: in code the language
  is still `ru`, and `langSegment()` / `langPaths()` in `src/i18n/index.ts` give it an empty URL segment.
- `404.astro` is `noindex`. The layout outputs no canonical or hreflang for it, and its language switch leads
  to the home page.
- Prettier: single quotes in `.astro`/`.tsx`, double quotes in `.ts`/`.mjs`/`.js`/`.css`, line width 120.
  Do not fight the formatter, just run `npm run format`.
- Code comments are in English, usually one line: a short hint about "what" or a non-obvious "why".
  No change history and no retelling of the code.

## Do not do without being asked

- Do not change copy marked "keep as is" in the audit, and do not add marketing or health claims.
- Do not touch the declaration PDFs or declaration numbers: they are copied verbatim from the documents.
- Do not add dependencies, other analytics counters or third-party scripts.
- The privacy policy copy (`privacy` in the dictionaries) is a draft: change it only on the owners' or a lawyer's
  instructions. If data processing changes (new events, another service), update the policy and its revision date.
- Do not commit or push unless asked.

## Astro documentation

https://docs.astro.build. Before working on a topic, open the relevant guide:
[routing](https://docs.astro.build/en/guides/routing/) ·
[components](https://docs.astro.build/en/basics/astro-components/) ·
[framework components](https://docs.astro.build/en/guides/framework-components/) ·
[styling and Tailwind](https://docs.astro.build/en/guides/styling/) ·
[i18n](https://docs.astro.build/en/guides/internationalization/).
