import { contacts as siteContacts, delivery as siteDelivery } from "@data/contacts";
import type { Dictionary, Lang } from "./types";

// Builds the final dictionaries: Kazakh falls back to Russian, placeholders get values from
// data/contacts.ts. Kept apart from index.ts so the unit tests can call it with other data.

type Contacts = typeof siteContacts;
type Delivery = typeof siteDelivery;

// Arrays are replaced as a whole, objects are merged key by key.
export const merge = <T>(base: T, over: unknown): T => {
  if (over === undefined) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) return over as T;
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    out[key] = merge(out[key], (over as Record<string, unknown>)[key]);
  }
  return out as T;
};

/** "A", "A или B", "A, B или C". */
export const joinList = (items: string[], conj: string) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${conj} ${items.at(-1)}`;

/** Delivery sentences built from data/contacts.ts and the locale's `delivery` templates. */
const deliveryTexts = (dict: Dictionary, lang: Lang, delivery: Delivery) => {
  const t = dict.delivery;
  const free = delivery.freeShippingThreshold;
  const freeText = free === undefined ? "" : ` ${t.freeFrom.replace("{sum}", free.toLocaleString("ru-RU"))}`;
  const carriers = delivery.carriers.map((c) => c[lang]);
  const cities = delivery.pickupCities.map((c) => c[lang]);
  return {
    "{deliveryCarriers}": joinList(carriers, t.or),
    /** Short form for card titles: "Jet Logistics / Казпочта". */
    "{deliveryCarrierList}": carriers.join(" / "),
    "{deliveryPickup}": t.pickup.replace("{cities}", joinList(cities, t.and)),
    "{deliveryTerms}": (delivery.paidByRecipient ? t.paidByRecipient : "") + freeText,
    "{deliveryTermsShort}": (delivery.paidByRecipient ? t.paidByRecipientShort : "") + freeText,
  };
};

// Texts write the phone as {phone} and delivery terms as {delivery…}, so the values live only in data/contacts.ts.
export const withContacts = (
  dict: Dictionary,
  lang: Lang,
  contacts: Contacts = siteContacts,
  delivery: Delivery = siteDelivery,
): Dictionary => {
  // A missing phone would print "undefined" on every page: stop the build instead. Delivery texts
  // may legitimately be empty (e.g. no terms to state), so they are not checked.
  if (JSON.stringify(dict).includes("{phone}") && !contacts.phone?.trim()) {
    throw new Error(`i18n: no value for {phone} (${lang}) — fill it in src/data/contacts.ts`);
  }
  let json = JSON.stringify(dict).replaceAll("{phone}", contacts.phone);
  for (const [key, value] of Object.entries(deliveryTexts(dict, lang, delivery))) {
    json = json.replaceAll(key, value.trim());
  }
  return JSON.parse(json);
};
