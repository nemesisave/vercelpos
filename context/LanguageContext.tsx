import React, { createContext, useContext, ReactNode } from 'react';
import { en } from '../locales/en';
import { es } from '../locales/es';

type Language = 'en' | 'es';

const translations = { en, es };

const resolve = (path: string, obj: any): any => {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode; language: Language; setLanguage: (language: Language) => void; }> = ({ children, language, setLanguage }) => {

  const t = (key: string): string => {
    const translated = resolve(key, translations[language]);
    if (typeof translated === 'string') {
      return translated;
    }
    const fallback = resolve(key, translations.en);
    if (typeof fallback === 'string') {
      return fallback;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // This is a special case. During the initial render of App.tsx, the provider is not yet mounted.
    // We provide a default implementation that will be replaced on the next render.
    return {
        language: 'es' as Language,
        setLanguage: () => {},
        t: (key: string) => key,
    }
  }
  return context;
};