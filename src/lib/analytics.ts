// Google Analytics 4 with basic Consent Mode: nothing is loaded and nothing is sent to Google
// until the visitor accepts. This module has no DOM side effects, so Vitest tests it directly;
// the browser part lives in components/ConsentBanner.astro.

export type AnalyticsEventName = "whatsapp_click" | "pdf_download" | "instagram_click";

export interface LinkEvent {
  name: AnalyticsEventName;
  params: Record<string, string>;
}

/** Measurement ID of a GA4 web stream, e.g. "G-AB12CD34EF". */
export const GA_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export const isValidGaId = (id: string | undefined): id is string => !!id && GA_ID_PATTERN.test(id);

/**
 * Reads PUBLIC_GA_ID for the layout. Analytics is only part of a production build with an ID;
 * a malformed ID stops the build instead of silently tracking nothing.
 */
export const resolveGaId = (raw: string | undefined, isProduction: boolean): string | undefined => {
  const id = raw?.trim();
  if (!id || !isProduction) return undefined;
  if (!isValidGaId(id)) throw new Error(`PUBLIC_GA_ID must look like "G-XXXXXXXXXX", got "${id}"`);
  return id;
};

/**
 * gtag.js is only requested on the real domain (the host of PUBLIC_SITE_URL). On localhost
 * (`astro preview`, E2E tests) and on hosting preview URLs the consent banner and the event
 * queue still work, so they can be tested, but no request leaves for Google.
 */
export const isTrackedHost = (hostname: string, siteUrl: string) => {
  const site = new URL(siteUrl).hostname.replace(/^www\./, "");
  return hostname.replace(/^www\./, "") === site;
};

/** Which tracked event a link click is, or null. Never prevents the click itself. */
export const classifyLink = (href: string, base: string): LinkEvent | null => {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me" || host === "api.whatsapp.com") {
    return { name: "whatsapp_click", params: { link_url: url.href } };
  }
  if (host === "instagram.com") {
    return { name: "instagram_click", params: { link_url: url.href } };
  }
  if (/\.pdf$/i.test(url.pathname)) {
    return { name: "pdf_download", params: { file_name: decodeURIComponent(url.pathname.split("/").pop() ?? "") } };
  }
  return null;
};

/** "/kz/product/gum/" → "kz". */
export const langFromPath = (pathname: string) => (pathname.split("/")[1] === "kz" ? "kz" : "ru");

// --- Consent -----------------------------------------------------------------------------------

export type ConsentValue = "granted" | "denied";

/** localStorage key; the value is JSON { value, at } with `at` in ms since epoch. */
export const CONSENT_KEY = "ss-analytics-consent";

/** The choice is asked again after this many days, as for cookies. */
export const CONSENT_MAX_AGE_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The stored choice, or null when there is none, it is unreadable or it has expired. */
export const parseConsent = (raw: string | null, now: number): ConsentValue | null => {
  if (!raw) return null;
  try {
    const { value, at } = JSON.parse(raw) as { value?: unknown; at?: unknown };
    if ((value !== "granted" && value !== "denied") || typeof at !== "number") return null;
    if (at > now || now - at > CONSENT_MAX_AGE_DAYS * DAY_MS) return null;
    return value;
  } catch {
    return null;
  }
};

export const serializeConsent = (value: ConsentValue, now: number) => JSON.stringify({ value, at: now });

/**
 * Consent Mode v2 state for gtag. There are no ads on the site, so the advertising signals stay
 * denied in every case; only analytics_storage follows the visitor's choice.
 */
export const consentState = (analytics: ConsentValue) => ({
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: analytics,
});

/** GA4 cookies to remove when consent is withdrawn: _ga and _ga_<stream>. */
export const isGaCookie = (name: string, gaId: string) => name === "_ga" || name === `_ga_${gaId.replace(/^G-/, "")}`;
