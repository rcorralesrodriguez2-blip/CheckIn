
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

type Language = 'en' | 'es' | 'pt';

type Translations = {
  [key: string]: any;
};

const translations: Record<Language, Translations> = { en, es, pt };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language | ((lang: Language) => Language)) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
  isClient: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('es'); // Default a español para mayor rapidez percibida en este contexto
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang && ['en', 'es', 'pt'].includes(storedLang)) {
      setLanguageState(storedLang);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      document.documentElement.lang = language;
      localStorage.setItem('language', language);
    }
  }, [language, isClient]);

  const setLanguage = useCallback((lang: Language | ((lang: Language) => Language)) => {
    setLanguageState(lang);
  }, []);
  
  const t = useCallback((key: string, replacements: Record<string, string> = {}): string => {
    let translation = translations[language]?.[key] || translations['en'][key] || key;
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(`{{${placeholder}}}`, replacements[placeholder]);
    });
    return translation;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    isClient
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
