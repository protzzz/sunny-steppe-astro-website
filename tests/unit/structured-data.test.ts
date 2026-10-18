import { describe, expect, it } from "vitest";
import { contacts } from "@data/contacts";
import { jsonLdString, siteJsonLd } from "@lib/structured-data";

const SITE = new URL("https://sunnysteppe.kz");

describe("siteJsonLd", () => {
  const graph = siteJsonLd(SITE)["@graph"];
  const org = graph.find((n) => n["@type"] === "Organization")!;
  const website = graph.find((n) => n["@type"] === "WebSite")!;

  it("describes the brand with the contacts from data/contacts.ts", () => {
    expect(org).toMatchObject({ name: "Sunny Steppe", url: "https://sunnysteppe.kz/", email: contacts.email });
    expect(org.sameAs).toEqual([contacts.instagramHref]);
    expect(org.contactPoint?.telephone).toMatch(/^\+\d{11}$/);
  });

  it("links the website to the brand", () => {
    expect(website.publisher).toEqual({ "@id": org["@id"] });
  });

  it("puts every URL on the site's domain, or on the brand's profiles", () => {
    const urls = JSON.stringify(siteJsonLd(SITE)).match(/https?:\/\/[^"]+/g)!;
    for (const url of urls) {
      if (url.startsWith("https://schema.org") || url === contacts.instagramHref) continue;
      expect(url.startsWith("https://sunnysteppe.kz/"), url).toBe(true);
    }
  });
});

describe("jsonLdString", () => {
  it("cannot close the script tag", () => {
    const out = jsonLdString({ text: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).text).toBe("</script><script>alert(1)</script>");
  });
});
