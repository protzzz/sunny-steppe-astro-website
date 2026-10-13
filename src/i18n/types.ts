import type { ru } from "./ru";

export type Lang = "ru" | "kz";
export const langs: Lang[] = ["ru", "kz"];

export type Dictionary = typeof ru;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type PartialDictionary = DeepPartial<Dictionary>;
