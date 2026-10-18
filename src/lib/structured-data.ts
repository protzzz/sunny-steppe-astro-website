import { contacts as siteContacts } from "@data/contacts";

// schema.org data for search engines: the brand (Organization) and the site (WebSite).
// No Product: Google requires a price, reviews or a rating for it, and prices are on request.

type Contacts = typeof siteContacts;

export const siteJsonLd = (site: URL, contacts: Contacts = siteContacts) => {
  const home = new URL("/", site).href;
  const organization = `${home}#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name: "Sunny Steppe",
        url: home,
        logo: new URL("/apple-touch-icon.png", site).href,
        email: contacts.email,
        sameAs: [contacts.instagramHref],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: contacts.phoneHref.replace(/^tel:/, ""),
          email: contacts.email,
          availableLanguage: ["ru", "kk"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: "Sunny Steppe",
        url: home,
        inLanguage: ["ru", "kk"],
        publisher: { "@id": organization },
      },
    ],
  };
};

/** JSON for a <script type="application/ld+json">; "<" is escaped so the text can't close the tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
