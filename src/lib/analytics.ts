// GA4 logic without DOM (tested by Vitest). Browser part: components/ConsentBanner.astro.

export type AnalyticsEventName = "whatsapp_click" | "pdf_download" | "instagram_click";

export interface LinkEvent {
  name: AnalyticsEventName;
  params: Record<string, string>;
}

/** Measurement ID of a GA4 web stream, e.g. "G-AB12CD34EF". */
export const GA_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export const isValidGaId = (id: string | undefined): id is string => !!id && GA_ID_PATTERN.test(id);

/** GA ID for a production build, otherwise undefined. A malformed ID fails the build. */
export const resolveGaId = (raw: string | undefined, isProduction: boolean): string | undefined => {
  const id = raw?.trim();
  if (!id || !isProduction) return undefined;
  if (!isValidGaId(id)) throw new Error(`PUBLIC_GA_ID must look like "G-XXXXXXXXXX", got "${id}"`);
  return id;
};

/** gtag.js loads only on the PUBLIC_SITE_URL host, never on localhost or preview URLs. */
export const isTrackedHost = (hostname: string, siteUrl: string) => {
  const site = new URL(siteUrl).hostname.replace(/^www\./, "");
  return hostname.replace(/^www\./, "") === site;
};

/** Tracked event for a link, or null. */
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

/** localStorage key; value: JSON { value, at } (at = ms since epoch). */
export const CONSENT_KEY = "ss-analytics-consent";

/** Ask again after this many days. */
export const CONSENT_MAX_AGE_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Stored choice, or null if missing, invalid or expired. */
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

/** Consent Mode v2 state. Ad signals are always denied (no ads on the site). */
export const consentState = (analytics: ConsentValue) => ({
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: analytics,
});

/** GA4 cookies removed on withdrawal: _ga, _ga_<stream>. */
export const isGaCookie = (name: string, gaId: string) => name === "_ga" || name === `_ga_${gaId.replace(/^G-/, "")}`;
