export function isConfirmedRoute(pathname: string, hash: string): boolean {
  return pathname === '/confirmed' && hash.includes('access_token');
}

export interface BrowserContext {
  isIOS: boolean;
  isAndroid: boolean;
  canInstall: boolean;
  isChromeiOS: boolean;
}

export function detectBrowserContext(userAgent: string): BrowserContext {
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger/i.test(userAgent);
  const isChromeiOS = /CriOS/i.test(userAgent);
  const isFirefoxIOS = /FxiOS/i.test(userAgent);

  let canInstall: boolean;
  if (isIOS) {
    // Chrome iOS installa via Share → Visualizza altro → Aggiungi alla schermata Home
    canInstall = !isInAppBrowser && !isFirefoxIOS;
  } else if (isAndroid) {
    canInstall = !isInAppBrowser;
  } else {
    canInstall = false;
  }

  return { isIOS, isAndroid, canInstall, isChromeiOS };
}

export function needsInstall({ isMobile, isStandalone }: { isMobile: boolean; isStandalone: boolean }): boolean {
  return isMobile && !isStandalone;
}
