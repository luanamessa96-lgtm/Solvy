import './lib/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    function notifyUpdate() {
      // Store on window so App.tsx can pick it up even if it mounts after this fires
      (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg = registration;
      window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: { registration } }));
    }

    // Case 1: new SW already waiting when page loads (most common on PWA reopen)
    if (registration.waiting && navigator.serviceWorker.controller) {
      notifyUpdate();
    }

    // Case 2: new SW found while page is open
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUpdate();
        }
      });
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
