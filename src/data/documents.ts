import { getProducts, type Product } from "@data/products";
import { getDict, type Lang } from "@i18n/index";

// EAEU declarations, copied from the PDFs in public/docs/.
export interface Declaration {
  product: Product["id"];
  /** Path under public/, also the download name. */
  file: string;
  number: string;
  validUntil: string;
}

export const regulations = "ТР ТС 021/2011 · 022/2011 · 029/2012";

export const declarations: Declaration[] = [
  {
    product: "xylitol",
    file: "/docs/sunny-steppe-declaration-eaeu-xylitol.pdf",
    number: "ЕАЭС N RU Д-CN.РА06.В.20103/26",
    validUntil: "20.07.2029",
  },
  {
    product: "lollipop",
    file: "/docs/sunny-steppe-declaration-eaeu-lollipop-dha.pdf",
    number: "ЕАЭС N RU Д-CN.РА06.В.20267/26",
    validUntil: "20.07.2029",
  },
  {
    product: "gum",
    file: "/docs/sunny-steppe-declaration-eaeu-energy-gum.pdf",
    number: "ЕАЭС N RU Д-CN.РА06.В.16517/26",
    validUntil: "17.07.2029",
  },
];

/** Declarations with product name and validity in a language. */
export const getDeclarations = (lang: Lang) => {
  const t = getDict(lang).docs;
  const products = getProducts(lang);
  return declarations.map((d) => ({
    ...d,
    productName: products.find((p) => p.id === d.product)?.name ?? "",
    valid: t.validUntil.replace("{date}", d.validUntil),
  }));
};
