import './lib/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Cattura solo in produzione e preview — non in dev locale
    enabled: import.meta.env.PROD,
    integrations: [
      Sentry.browserTracingIntegration(),
      // replayIntegration caricata dopo il boot per non rallentare il LCP
    ],
    // Performance: campiona 10% delle sessioni in produzione
    tracesSampleRate: 0.1,
    // Session Replay: 5% delle sessioni normali, 100% degli errori
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });

  // Carica Session Replay 4s dopo il caricamento — è pesante e non è critica per il boot
  window.addEventListener('load', () => {
    setTimeout(() => {
      Sentry.addIntegration(Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }));
    }, 4000);
  }, { once: true });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    function notifyUpdate() {
      (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg = registration;
      window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: { registration } }));
    }

    function trackWorker(sw: ServiceWorker) {
      // Check current state first — worker may already be installed before listener attaches
      if (sw.state === 'installed') { notifyUpdate(); return; }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed') notifyUpdate();
      });
    }

    // Case 1: new SW already waiting (PWA reopen after deploy)
    if (registration.waiting) {
      notifyUpdate();
    }

    // Case 2: new SW currently installing (page opened mid-update)
    if (registration.installing) {
      trackWorker(registration.installing);
    }

    // Case 3: new SW found while app is open
    registration.addEventListener('updatefound', () => {
      if (registration.installing) trackWorker(registration.installing);
    });

    // Force update check every 60s as fallback
    setInterval(() => registration.update(), 60_000);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
