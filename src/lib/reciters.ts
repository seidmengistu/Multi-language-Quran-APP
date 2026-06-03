/**
 * Static list of available Quran reciters.
 * All Tier 1 reciters have word-level timing segments from QuranCDN.
 */

export interface Reciter {
  id: number;            // QuranCDN audio recitation ID
  name: string;          // Display name
  arabicName: string;    // Arabic name
  style: string;         // "Murattal" | "Mujawwad" | "Muallim" | "Kids repeat"
  hasWordTiming: true;   // All Tier 1 reciters have word-level sync
}

export const RECITERS: Reciter[] = [
  { id: 7,   name: "Mishari Rashid al-Afasy",   arabicName: "مشاري راشد العفاسي",    style: "Murattal",    hasWordTiming: true },
  { id: 2,   name: "AbdulBaset AbdulSamad",     arabicName: "عبد الباسط عبد الصمد",   style: "Murattal",    hasWordTiming: true },
  { id: 1,   name: "AbdulBaset AbdulSamad",     arabicName: "عبد الباسط عبد الصمد",   style: "Mujawwad",    hasWordTiming: true },
  { id: 3,   name: "Abdur-Rahman as-Sudais",    arabicName: "عبد الرحمن السديس",      style: "Murattal",    hasWordTiming: true },
  { id: 4,   name: "Abu Bakr al-Shatri",        arabicName: "أبو بكر الشاطري",        style: "Murattal",    hasWordTiming: true },
  { id: 5,   name: "Hani ar-Rifai",             arabicName: "هاني الرفاعي",           style: "Murattal",    hasWordTiming: true },
  { id: 6,   name: "Mahmoud Khalil Al-Husary",  arabicName: "محمود خليل الحصري",      style: "Murattal",    hasWordTiming: true },
  { id: 12,  name: "Mahmoud Khalil Al-Husary",  arabicName: "محمود خليل الحصري",      style: "Muallim",     hasWordTiming: true },
  { id: 9,   name: "Mohamed Siddiq al-Minshawi",arabicName: "محمد صديق المنشاوي",     style: "Murattal",    hasWordTiming: true },
  { id: 10,  name: "Sa'ud ash-Shuraim",         arabicName: "سعود الشريم",            style: "Murattal",    hasWordTiming: true },
  { id: 97,  name: "Yasser Ad-Dussary",         arabicName: "ياسر الدوسري",           style: "Murattal",    hasWordTiming: true },
  { id: 161, name: "Khalifah Al-Tunaiji",       arabicName: "خليفة الطنيجي",          style: "Murattal",    hasWordTiming: true },
  { id: 168, name: "Mohamed Siddiq al-Minshawi",arabicName: "محمد صديق المنشاوي",     style: "Kids repeat", hasWordTiming: true },
  { id: 173, name: "Mishari Rashid al-Afasy",   arabicName: "مشاري راشد العفاسي",    style: "Murattal",    hasWordTiming: true },
];

export const DEFAULT_RECITER = RECITERS[0]; // Alafasy Murattal

export function getReciterById(id: number): Reciter | undefined {
  return RECITERS.find(r => r.id === id);
}
