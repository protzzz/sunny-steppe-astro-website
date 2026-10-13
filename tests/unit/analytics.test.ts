import { describe, expect, it } from "vitest";
import { contacts } from "@data/contacts";
import { declarations } from "@data/documents";
import {
  CONSENT_MAX_AGE_DAYS,
  classifyLink,
  consentState,
  isGaCookie,
  isTrackedHost,
  isValidGaId,
  langFromPath,
  parseConsent,
  resolveGaId,
  serializeConsent,
} from "@lib/analytics";

const BASE = "https://sunnysteppe.kz/product/gum/";
const DAY = 24 * 60 * 60 * 1000;

describe("classifyLink", () => {
  it("recognizes the site's own WhatsApp, Instagram and PDF links", () => {
    expect(classifyLink(contacts.whatsappHref, BASE)?.name).toBe("whatsapp_click");
    expect(classifyLink(contacts.instagramHref, BASE)?.name).toBe("instagram_click");
    for (const d of declarations) {
      const event = classifyLink(d.file, BASE);
      expect(event?.name).toBe("pdf_download");
      expect(event?.params.file_name).toBe(d.file.split("/").pop());
    }
  });

  it.each([
    ["https://api.whatsapp.com/send?phone=77080382110", "whatsapp_click"],
    ["https://www.instagram.com/sunnysteppe.kz/", "instagram_click"],
    ["/docs/File.PDF", "pdf_download"],
    ["https://example.com/doc.pdf?x=1", "pdf_download"],
  ])("%s → %s", (href, name) => {
    expect(classifyLink(href, BASE)?.name).toBe(name);
  });

  it.each([
    "/catalog/",
    "tel:+77080382110",
    "mailto:sunnysteppe@mail.ru",
    "#main",
    "https://example.com/",
    "http://[bad",
  ])("ignores %s", (href) => {
    expect(classifyLink(href, BASE)).toBeNull();
  });
});

describe("GA ID", () => {
  it("accepts a GA4 Measurement ID only", () => {
    expect(isValidGaId("G-AB12CD34EF")).toBe(true);
    for (const bad of [undefined, "", "UA-12345-1", "G-", "g-ab12cd", "G-AB 12", "12345678"]) {
      expect(isValidGaId(bad)).toBe(false);
    }
  });

  it("is only used in a production build", () => {
    expect(resolveGaId("G-AB12CD34EF", true)).toBe("G-AB12CD34EF");
    expect(resolveGaId(" G-AB12CD34EF ", true)).toBe("G-AB12CD34EF");
    expect(resolveGaId("G-AB12CD34EF", false)).toBeUndefined();
    expect(resolveGaId("", true)).toBeUndefined();
    expect(resolveGaId(undefined, true)).toBeUndefined();
  });

  it("stops a production build with a malformed ID", () => {
    expect(() => resolveGaId("UA-1234-1", true)).toThrow(/PUBLIC_GA_ID/);
  });
});

describe("isTrackedHost", () => {
  it("loads GA on the site's domain only", () => {
    expect(isTrackedHost("sunnysteppe.kz", "https://sunnysteppe.kz/")).toBe(true);
    expect(isTrackedHost("www.sunnysteppe.kz", "https://sunnysteppe.kz/")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "sunny-steppe.pages.dev", "preview-12.sunnysteppe.kz"]) {
      expect(isTrackedHost(host, "https://sunnysteppe.kz/")).toBe(false);
    }
  });
});

describe("consent storage", () => {
  const now = Date.UTC(2026, 9, 13);

  it("reads back what was saved", () => {
    expect(parseConsent(serializeConsent("granted", now), now)).toBe("granted");
    expect(parseConsent(serializeConsent("denied", now), now + DAY)).toBe("denied");
  });

  it(`asks again after ${CONSENT_MAX_AGE_DAYS} days`, () => {
    const saved = serializeConsent("granted", now);
    expect(parseConsent(saved, now + (CONSENT_MAX_AGE_DAYS - 1) * DAY)).toBe("granted");
    expect(parseConsent(saved, now + (CONSENT_MAX_AGE_DAYS + 1) * DAY)).toBeNull();
  });

  it.each([null, "", "granted", "{}", '{"value":"yes","at":1}', '{"value":"granted"}', "{broken"])(
    "treats %s as no choice",
    (raw) => {
      expect(parseConsent(raw, now)).toBeNull();
    },
  );

  it("does not trust a date in the future", () => {
    expect(parseConsent(serializeConsent("granted", now + DAY), now)).toBeNull();
  });
});

describe("consentState", () => {
  it("never grants the advertising signals", () => {
    for (const value of ["granted", "denied"] as const) {
      const state = consentState(value);
      expect(state.analytics_storage).toBe(value);
      expect([state.ad_storage, state.ad_user_data, state.ad_personalization]).toEqual(["denied", "denied", "denied"]);
    }
  });
});

describe("helpers", () => {
  it("finds the language in the path", () => {
    expect(langFromPath("/kz/product/gum/")).toBe("kz");
    expect(langFromPath("/catalog/")).toBe("ru");
    expect(langFromPath("/")).toBe("ru");
  });

  it("recognizes the GA cookies of this stream only", () => {
    expect(isGaCookie("_ga", "G-AB12CD")).toBe(true);
    expect(isGaCookie("_ga_AB12CD", "G-AB12CD")).toBe(true);
    expect(isGaCookie("_ga_OTHER", "G-AB12CD")).toBe(false);
    expect(isGaCookie("_gid_x", "G-AB12CD")).toBe(false);
  });
});
