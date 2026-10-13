export const contacts = {
  phone: "+7 (708) 038-21-10",
  phoneHref: "tel:+77080382110",
  whatsappHref: "https://wa.me/77080382110",
  instagram: "@sunnysteppe.kz",
  instagramHref: "https://instagram.com/sunnysteppe.kz",
  email: "sunnysteppe@mail.ru",
  emailHref: "mailto:sunnysteppe@mail.ru",
};

/** Delivery terms (confirmed by the owners). Sentences: `delivery.*` in the dictionaries. */
export const delivery = {
  carriers: [
    { ru: "Jet Logistics", kz: "Jet Logistics" },
    { ru: "Казпочта", kz: "Қазпошта" },
  ],
  /** Pickup cities in sentence form: after "в" (ru), locative (kz). */
  pickupCities: [
    { ru: "Алматы", kz: "Алматыда" },
    { ru: "Караганде", kz: "Қарағандыда" },
  ],
  paidByRecipient: true,
  /** Free delivery from this total (₸). undefined: not shown. */
  freeShippingThreshold: undefined as number | undefined,
};
