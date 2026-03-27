import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from '../locales/it.json';

// Only Italian loaded at startup — Spanish loads lazily when needed
i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
    },
    lng: 'it',
    fallbackLng: 'it',
    interpolation: { escapeValue: false },
  });

export async function setLanguageByCountry(country: string) {
  if (country === 'Spain') {
    if (!i18n.hasResourceBundle('es', 'translation')) {
      const { default: es } = await import('../locales/es.json');
      i18n.addResourceBundle('es', 'translation', es);
    }
    i18n.changeLanguage('es');
  } else {
    i18n.changeLanguage('it');
  }
}

export default i18n;
