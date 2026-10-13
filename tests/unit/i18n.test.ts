import { describe, expect, it } from "vitest";
import astroConfig from "../../astro.config.mjs";
import { contacts, delivery } from "@data/contacts";
import { merge, withContacts } from "@i18n/build";
import { getDict, langs, localePath } from "@i18n/index";
import { ru } from "@i18n/ru";
import { kz } from "@i18n/kz";

describe("merge", () => {
  it("overrides leaves, keeps keys the override lacks, replaces arrays whole", () => {
    const base = { a: "ru-a", b: { c: "ru-c", d: "ru-d" }, list: ["x", "y", "z"] };
    const out = merge(base, { b: { c: "kz-c" }, list: ["k"] });
    expect(out).toEqual({ a: "ru-a", b: { c: "kz-c", d: "ru-d" }, list: ["k"] });
  });

  it("ignores keys that only exist in the override", () => {
    expect(merge({ a: 1 }, { a: 2, extra: 3 })).toEqual({ a: 2 });
  });

  it("returns the base untouched when there is no override", () => {
    const base = { a: { b: "c" } };
    expect(merge(base, undefined)).toBe(base);
  });

  it("gives the Kazakh dictionary every key of the Russian one", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      typeof o === "object" && o !== null && !Array.isArray(o)
        ? Object.entries(o).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
        : [prefix];
    expect(keys(merge(ru, kz))).toEqual(keys(ru));
  });
});

describe("withContacts", () => {
  it.each(langs)("leaves no placeholders in the %s dictionary", (lang) => {
    const json = JSON.stringify(getDict(lang));
    expect(json).not.toMatch(/\{(phone|delivery\w*)\}/);
    expect(json).toContain(contacts.phone);
  });

  it("puts the phone into every text that had {phone}", () => {
    const withPhone = JSON.stringify(ru).split("{phone}").length - 1;
    expect(withPhone).toBeGreaterThan(0);
    const json = JSON.stringify(withContacts(ru, "ru"));
    expect(json.split(contacts.phone).length - 1).toBeGreaterThanOrEqual(withPhone);
  });

  it("stops the build when the phone is missing, instead of printing 'undefined'", () => {
    const noPhone = { ...contacts, phone: undefined as unknown as string };
    expect(() => withContacts(ru, "ru", noPhone)).toThrow(/\{phone\}/);
    expect(() => withContacts(ru, "ru", { ...contacts, phone: "  " })).toThrow(/\{phone\}/);
  });

  it("adds the free-shipping sentence only when a threshold is set", () => {
    const without = JSON.stringify(withContacts(ru, "ru", contacts, { ...delivery, freeShippingThreshold: undefined }));
    const withFree = JSON.stringify(withContacts(ru, "ru", contacts, { ...delivery, freeShippingThreshold: 20000 }));
    expect(without).not.toContain("20 000");
    expect(withFree).toMatch(/20\s000/);
  });
});

describe("localePath", () => {
  // Read from the Astro config, so the test follows the setting instead of restating it.
  const trailingSlash = astroConfig.trailingSlash ?? "ignore";
  const samples = langs.flatMap((lang) =>
    ["/", "/catalog", "/product/gum", "/product/xylitol"].map((path) => ({ lang, path })),
  );

  it.each(samples)("$lang: $path", ({ lang, path }) => {
    const out = localePath(lang, path).replace(/(.)\/$/, "$1");
    // Russian lives at the site root, Kazakh under /kz.
    const prefix = lang === "kz" ? "/kz" : "";
    expect(out).toBe(path === "/" ? prefix || "/" : `${prefix}${path}`);
  });

  it("defaults to the language root", () => {
    expect(localePath("ru")).toBe("/");
    expect(localePath("kz")).toBe("/kz/");
  });

  it("never writes a /ru prefix or a double slash", () => {
    for (const { lang, path } of samples) {
      expect(localePath(lang, path)).not.toMatch(/^\/ru(\/|$)|\/\//);
    }
  });

  it(`writes every path in the trailingSlash: "${trailingSlash}" format`, () => {
    const endsWithSlash = samples.map(({ lang, path }) => localePath(lang, path).endsWith("/"));
    if (trailingSlash === "always") expect(endsWithSlash.every(Boolean)).toBe(true);
    else if (trailingSlash === "never") expect(endsWithSlash.some(Boolean)).toBe(false);
    // "ignore" accepts both, but mixing them would still split URLs: one format for all.
    else expect(new Set(endsWithSlash).size).toBe(1);
  });
});
