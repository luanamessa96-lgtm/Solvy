import { describe, it, expect } from 'vitest';
import { isConfirmedRoute, detectBrowserContext, needsInstall } from '../lib/installGate';

describe('isConfirmedRoute', () => {
  it('returns true when pathname is /confirmed and hash has access_token', () => {
    expect(isConfirmedRoute('/confirmed', '#access_token=abc123&type=signup')).toBe(true);
  });

  it('returns false when pathname is /confirmed but no access_token in hash', () => {
    expect(isConfirmedRoute('/confirmed', '#error=invalid_token')).toBe(false);
  });

  it('returns false when pathname is / even with token in hash', () => {
    expect(isConfirmedRoute('/', '#access_token=abc123')).toBe(false);
  });

  it('returns false when pathname is /confirmed with empty hash', () => {
    expect(isConfirmedRoute('/confirmed', '')).toBe(false);
  });
});

describe('detectBrowserContext', () => {
  it('detects iOS Safari as installable', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
    const ctx = detectBrowserContext(ua);
    expect(ctx.isIOS).toBe(true);
    expect(ctx.isAndroid).toBe(false);
    expect(ctx.canInstall).toBe(true);
  });

  it('detects iOS Chrome as not installable', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/109.0.0.0 Mobile/15E148 Safari/604.1';
    const ctx = detectBrowserContext(ua);
    expect(ctx.isIOS).toBe(true);
    expect(ctx.canInstall).toBe(false);
  });

  it('detects Instagram in-app browser as not installable', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 FBAN/FBIOS;FBDV/iPhone;FBMD/unknown';
    const ctx = detectBrowserContext(ua);
    expect(ctx.isIOS).toBe(true);
    expect(ctx.canInstall).toBe(false);
  });

  it('detects Android Chrome as installable', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36';
    const ctx = detectBrowserContext(ua);
    expect(ctx.isIOS).toBe(false);
    expect(ctx.isAndroid).toBe(true);
    expect(ctx.canInstall).toBe(true);
  });

  it('detects desktop as neither iOS nor Android', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    const ctx = detectBrowserContext(ua);
    expect(ctx.isIOS).toBe(false);
    expect(ctx.isAndroid).toBe(false);
  });
});

describe('needsInstall', () => {
  it('returns true for mobile not in standalone', () => {
    expect(needsInstall({ isMobile: true, isStandalone: false })).toBe(true);
  });

  it('returns false for mobile in standalone mode', () => {
    expect(needsInstall({ isMobile: true, isStandalone: true })).toBe(false);
  });

  it('returns false for desktop regardless of standalone', () => {
    expect(needsInstall({ isMobile: false, isStandalone: false })).toBe(false);
  });
});
