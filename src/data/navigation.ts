import type { Dictionary } from "@i18n/types";

// Menu order: products and information first, then the brand; contacts stay last, where visitors look for them.
const routes = [
  ["/", "home"],
  ["/catalog", "catalog"],
  ["/xylitol", "xylitol"],
  ["/faq", "faq"],
  ["/about", "about"],
  ["/contacts", "contacts"],
] as const;

export interface NavItem {
  route: string;
  label: string;
}

export const getNavItems = (nav: Dictionary["nav"]): NavItem[] =>
  routes.map(([route, key]) => ({ route, label: nav[key] }));

/** Home matches itself only; others match sub-pages too. */
export const isActive = (route: string, current: string) =>
  route === "/" ? current === "/" : current.startsWith(route);
