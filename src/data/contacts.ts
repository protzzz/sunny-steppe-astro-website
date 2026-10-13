export const contacts = {
  phone: "+7 (708) 038-21-10",
  phoneHref: "tel:+77080382110",
  whatsappHref: "https://wa.me/77080382110",
  instagram: "@sunnysteppe.kz",
  instagramHref: "https://instagram.com/sunnysteppe.kz",
  email: "sunnysteppe@mail.ru",
  emailHref: "mailto:sunnysteppe@mail.ru",
};

/**
 * Delivery terms confirmed by the owners. The sentences around these values live in the
 * dictionaries (`delivery.*`) and are assembled in i18n/index.ts.
 */
export const delivery = {
  carriers: [
    { ru: "Jet Logistics", kz: "Jet Logistics" },
    { ru: "Казпочта", kz: "Қазпошта" },
  ],
  /** Pickup cities, already in the form the sentence needs: after "в" in Russian, with the locative ending in Kazakh. */
  pickupCities: [
    { ru: "Алматы", kz: "Алматыда" },
    { ru: "Караганде", kz: "Қарағандыда" },
  ],
  paidByRecipient: true,
  /** Order total in tenge from which delivery is free. Not offered yet, so nothing is shown while it is undefined. */
  freeShippingThreshold: undefined as number | undefined,
};
