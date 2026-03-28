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

// Counter to cancel stale async language changes (race condition: Spain import
// resolves after a subsequent Italy call, overwriting the correct language)
let _langReqId = 0;

export async function setLanguageByCountry(country: string) {
  const reqId = ++_langReqId;
  if (country === 'Spain') {
    if (!i18n.hasResourceBundle('es', 'translation')) {
      const { default: es } = await import('../locales/es.json');
      i18n.addResourceBundle('es', 'translation', es);
    }
    if (reqId === _langReqId) {
      i18n.changeLanguage('es');
    }
  } else {
    i18n.changeLanguage('it');
  }
}

export default i18n;
