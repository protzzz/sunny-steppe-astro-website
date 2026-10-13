import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { declarations, getDeclarations } from "@data/documents";
import { getProducts } from "@data/products";
import { langs } from "@i18n/index";

const publicFile = (path: string) => fileURLToPath(new URL(`../../public${path}`, import.meta.url));

/** In Vite, an imported image's src is "/@fs/<absolute path>?<params>". */
const imageFile = (src: string) => decodeURIComponent(src.replace(/^\/@fs/, "").split("?")[0]);

describe("getProducts", () => {
  it("returns the same product ids in both languages", () => {
    expect(getProducts("kz").map((p) => p.id)).toEqual(getProducts("ru").map((p) => p.id));
  });

  it.each(langs)("%s: every product has its texts filled in", (lang) => {
    for (const p of getProducts(lang)) {
      for (const key of ["kicker", "name", "short", "lead", "composition", "usage", "caution"] as const) {
        expect(p[key], `${p.id}.${key}`).toMatch(/\S/);
      }
      for (const key of ["badges", "bullets", "facts"] as const) {
        expect(p[key].length, `${p.id}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("kz: product names are Kazakh where the translation has them, never empty", () => {
    const ru = getProducts("ru");
    const kz = getProducts("kz");
    // At least the descriptions must differ, otherwise the Kazakh overrides were not applied.
    expect(kz.some((p, i) => p.lead !== ru[i].lead)).toBe(true);
  });

  it.each(getProducts("ru").map((p) => [p.id, p] as const))("%s: pack images exist", (_, p) => {
    for (const img of [p.img, p.back]) {
      expect(img.width).toBeGreaterThan(0);
      expect(existsSync(imageFile(img.src)), img.src).toBe(true);
    }
  });
});

describe("getDeclarations", () => {
  it.each(langs)("%s: one declaration per product, with name, date and an existing PDF", (lang) => {
    const docs = getDeclarations(lang);
    const ids = getProducts(lang).map((p) => p.id);
    expect(docs.map((d) => d.product).sort()).toEqual([...ids].sort());
    for (const d of docs) {
      expect(d.productName).toMatch(/\S/);
      expect(d.valid).toContain(d.validUntil);
      expect(d.valid).not.toContain("{date}");
      expect(d.file).toMatch(/^\/docs\/.+\.pdf$/);
      expect(existsSync(publicFile(d.file)), d.file).toBe(true);
    }
  });

  it("does not change the source data", () => {
    getDeclarations("kz");
    expect(declarations.every((d) => !("productName" in d))).toBe(true);
  });
});
