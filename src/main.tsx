import './lib/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    function notifyUpdate() {
      (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg = registration;
      window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: { registration } }));
    }

    function trackWorker(sw: ServiceWorker) {
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
