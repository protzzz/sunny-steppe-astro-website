import { ru } from "./ru";
import { kz } from "./kz";
import { merge, withContacts } from "./build";
import { langs, type Dictionary, type Lang } from "./types";

export * from "./types";

const dicts: Record<Lang, Dictionary> = { ru: withContacts(ru, "ru"), kz: withContacts(merge(ru, kz), "kz") };

export const getDict = (lang: Lang): Dictionary => dicts[lang];

/** Language names for the switch (read by screen readers). */
export const langNames: Record<Lang, string> = { ru: "Русский", kz: "Қазақша" };

/** Russian at the root, Kazakh under /kz/. */
export const DEFAULT_LANG: Lang = "ru";

/** URL segment: none for Russian, "kz" for Kazakh. */
export const langSegment = (lang: Lang) => (lang === DEFAULT_LANG ? undefined : lang);

/** Language from the `[...lang]` param (empty = Russian). */
export const langFromParam = (param: string | undefined): Lang => (param === "kz" ? "kz" : DEFAULT_LANG);

/** Localized link with a trailing slash: ("ru", "/catalog") → "/catalog/", ("kz") → "/kz/". */
export const localePath = (lang: Lang, path = "/") => {
  const segment = langSegment(lang);
  const page = path.replace(/\/+$/, "");
  return segment ? `/${segment}${page}/` : `${page}/`;
};

/** getStaticPaths for src/pages/[...lang]/. */
export const langPaths = () => langs.map((lang) => ({ params: { lang: langSegment(lang) } }));
