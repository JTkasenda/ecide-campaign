"use client";

import { createContext, useContext, type ReactNode } from "react";
import { makeT, type Strings, type T } from "./t";

export type { Strings, T };

const I18nContext = createContext<{ locale: string; strings: Strings }>({ locale: "fr", strings: {} });

/** Fournit le dictionnaire d'interface de la langue courante aux composants client. */
export function I18nProvider({ locale, strings, children }: { locale: string; strings: Strings; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, strings }}>{children}</I18nContext.Provider>;
}

/** Dans un composant client : const { t, locale } = useI18n(). */
export function useI18n(): { t: T; locale: string } {
  const { locale, strings } = useContext(I18nContext);
  return { t: makeT(strings), locale };
}
