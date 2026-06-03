/**
 * Bundled translation registry. `id` matches both the Quran.com resource id
 * and the bundled file `public/data/translations/<id>.json`.
 * Keep in sync with scripts/download-translations.mjs.
 */

export interface TranslationOption {
  id: number;
  language: string;
  name: string; // translator
  nativeLabel: string; // language in its own script
  dir: "ltr" | "rtl";
  available: boolean;
}

export const TRANSLATIONS: TranslationOption[] = [
  { id: 87, language: "Amharic", name: "Sadiq & Sani", nativeLabel: "አማርኛ", dir: "ltr", available: true },
  { id: 111, language: "Afaan Oromo", name: "Sheikh Ghali", nativeLabel: "Afaan Oromoo", dir: "ltr", available: true },
  { id: 46, language: "Somali", name: "Mahmud M. Abduh", nativeLabel: "Soomaali", dir: "ltr", available: true },
  { id: 20, language: "English", name: "Saheeh International", nativeLabel: "English", dir: "ltr", available: true },
  { id: 57, language: "Transliteration", name: "Latin script", nativeLabel: "Translit.", dir: "ltr", available: true },
  // No reliable complete Tigrinya mushaf translation exists yet.
  { id: -1, language: "Tigrinya", name: "Coming soon", nativeLabel: "ትግርኛ", dir: "ltr", available: false },
];

export const DEFAULT_TRANSLATION_ID = 87; // Amharic

export function getTranslation(id: number): TranslationOption | undefined {
  return TRANSLATIONS.find((t) => t.id === id);
}

export function resolveTranslationId(raw: number | string | undefined): number {
  const id = Number(raw);
  return TRANSLATIONS.some((t) => t.id === id && t.available)
    ? id
    : DEFAULT_TRANSLATION_ID;
}
