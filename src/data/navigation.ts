import type { Dictionary } from "@i18n/types";

const routes = [
  ["/", "home"],
  ["/about", "about"],
  ["/catalog", "catalog"],
  ["/xylitol", "xylitol"],
  ["/faq", "faq"],
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
