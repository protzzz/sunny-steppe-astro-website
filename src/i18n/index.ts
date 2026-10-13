import { ru } from "./ru";
import { kz } from "./kz";
import { merge, withContacts } from "./build";
import { langs, type Dictionary, type Lang } from "./types";

export * from "./types";

const dicts: Record<Lang, Dictionary> = { ru: withContacts(ru, "ru"), kz: withContacts(merge(ru, kz), "kz") };

export const getDict = (lang: Lang): Dictionary => dicts[lang];

/** Each language's name in that language, for the language switch (it is what a screen reader announces). */
export const langNames: Record<Lang, string> = { ru: "Русский", kz: "Қазақша" };

/** Russian is the main language and lives at the site root; Kazakh lives under /kz/. */
export const DEFAULT_LANG: Lang = "ru";

/** The language's first URL segment: none for Russian, "kz" for Kazakh. */
export const langSegment = (lang: Lang) => (lang === DEFAULT_LANG ? undefined : lang);

/** Language of a page from its `[...lang]` route parameter (empty for Russian). */
export const langFromParam = (param: string | undefined): Lang => (param === "kz" ? "kz" : DEFAULT_LANG);

/**
 * Builds a localized link with the trailing slash the site uses (trailingSlash: "always"):
 * localePath("ru", "/catalog") → "/catalog/", localePath("kz", "/catalog") → "/kz/catalog/",
 * localePath("ru") → "/", localePath("kz") → "/kz/".
 */
export const localePath = (lang: Lang, path = "/") => {
  const segment = langSegment(lang);
  const page = path.replace(/\/+$/, "");
  return segment ? `/${segment}${page}/` : `${page}/`;
};

/** getStaticPaths for pages under src/pages/[...lang]/: the root for Russian, /kz/ for Kazakh. */
export const langPaths = () => langs.map((lang) => ({ params: { lang: langSegment(lang) } }));
