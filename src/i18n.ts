// src/i18n.js, config file to initialize i18n translations
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend) // charges translations from the server or public/locales directory
  .use(LanguageDetector) // detect user language
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    fallbackLng: 'en', // use en if detected lng is not available
    debug: true, // enable console logging in development
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', 
    },
    interpolation: {
      escapeValue: false, 
    },
  });

export default i18n;
