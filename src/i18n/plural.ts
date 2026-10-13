// Picks the form for "one / few / many" (Russian rules); fractions take "few".
// Kazakh doesn't inflect nouns after numbers, so its dictionary repeats one word.
export const cupsWord = (v: number, [one, few, many]: readonly string[]) => {
  if (v % 1 !== 0) return few;
  const n100 = v % 100;
  const n10 = v % 10;
  if (n100 > 10 && n100 < 20) return many;
  if (n10 === 1) return one;
  if (n10 >= 2 && n10 <= 4) return few;
  return many;
};
