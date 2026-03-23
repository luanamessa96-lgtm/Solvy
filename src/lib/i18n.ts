import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from '../locales/it.json';
import es from '../locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      es: { translation: es },
    },
    lng: 'it',
    fallbackLng: 'it',
    interpolation: { escapeValue: false },
  });

export function setLanguageByCountry(country: string) {
  if (country === 'Spain') {
    i18n.changeLanguage('es');
  } else {
    i18n.changeLanguage('it');
  }
}

export default i18n;
