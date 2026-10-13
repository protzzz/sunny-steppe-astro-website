import { describe, expect, it } from "vitest";
import { getDict } from "@i18n/index";
import { cupsWord } from "@i18n/plural";

describe("cupsWord", () => {
  const [one, few, many] = getDict("ru").gumCalc.cups;

  it.each([
    [0, many],
    [1, one],
    [2, few],
    [4, few],
    [5, many],
    [11, many],
    [12, many],
    [14, many],
    [21, one],
    [22, few],
    [25, many],
    [101, one],
    [111, many],
  ])("ru: %i → %s", (n, word) => {
    expect(cupsWord(n, getDict("ru").gumCalc.cups)).toBe(word);
  });

  it("ru: fractions take the 'few' form", () => {
    expect(cupsWord(1.5, getDict("ru").gumCalc.cups)).toBe(few);
  });

  it("kz: the noun does not change with the number", () => {
    const cups = getDict("kz").gumCalc.cups;
    const forms = new Set([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111, 1.5].map((n) => cupsWord(n, cups)));
    expect(forms.size).toBe(1);
  });
});
