import '@fontsource-variable/inter';
import './lib/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Render React immediately — Sentry loaded after page is interactive
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Load Sentry after window.load — removes ~100 kB gzip from critical path
if (import.meta.env.VITE_SENTRY_DSN) {
  window.addEventListener('load', () => {
    import('@sentry/react').then(Sentry => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        enabled: import.meta.env.PROD,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.05,
        replaysOnErrorSampleRate: 1.0,
      });
      // Session Replay — 4s dopo load, pesante e non critica per il boot
      setTimeout(() => {
        Sentry.addIntegration(Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }));
      }, 4000);
    });
  }, { once: true });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    function notifyUpdate() {
      (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg = registration;
      window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: { registration } }));
    }

    function trackWorker(sw: ServiceWorker) {
      if (sw.state === 'installed') { notifyUpdate(); return; }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed') notifyUpdate();
      });
    }

    if (registration.waiting) notifyUpdate();
    if (registration.installing) trackWorker(registration.installing);

    registration.addEventListener('updatefound', () => {
      if (registration.installing) trackWorker(registration.installing);
    });

    setInterval(() => registration.update(), 60_000);
  });
}
