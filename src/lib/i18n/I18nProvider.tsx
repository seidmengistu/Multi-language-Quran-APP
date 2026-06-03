"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { STRINGS, LANGS, type Lang } from "./strings";

type Vars = Record<string, string | number>;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LANG_KEY = "appLang";

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function translate(lang: Lang, key: string, vars?: Vars): string {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return interpolate(s, vars);
}

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const t = useCallback(
    (key: string, vars?: Vars) => translate(lang, key, vars),
    [lang]
  );

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
      document.cookie = `${LANG_KEY}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* ignore */
    }
    // Keep the Qur'an translation in sync with the chosen app language.
    const tid = LANGS.find((x) => x.code === l)?.translationId;
    if (tid) {
      fetch("/api/translation/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ translationId: tid }),
      }).catch(() => {});
    }
  }, []);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (c) return c;
  // Safe fallback if used outside the provider (English, no-op switch).
  return { lang: "en", setLang: () => {}, t: (k, v) => translate("en", k, v) };
}

export function useT() {
  return useI18n().t;
}

export function useLang() {
  const { lang, setLang } = useI18n();
  return { lang, setLang };
}
