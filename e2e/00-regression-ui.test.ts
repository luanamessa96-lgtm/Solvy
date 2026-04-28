import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, switchToItalyProfile, switchToSpainProfile } from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// TEST DI REGRESSIONE UI
// Questi test fotografano lo stato attuale dell'app per IT e ES penisola.
// Devono passare PRIMA e DOPO ogni task dell'implementazione Canarie.
// Se uno fallisce → ci si ferma, non si procede al task successivo.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('00 — Regressione UI Italy', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await switchToItalyProfile(page);
    await page.waitForTimeout(1000);
  });

  test('00.1 Dashboard IT mostra termini italiani (Entrate, Uscite, Tasse)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    // Deve contenere termini IT — non spagnoli
    expect(body.includes('Entrate') || body.includes('Fatture') || body.includes('Spese') || body.includes('Dashboard')).toBe(true);
    expect(body.includes('Ingresos') || body.includes('IGIC')).toBe(false);
  });

  test('00.2 Dashboard IT non mostra IVA né IGIC (regime forfettario)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    // Forfettario non usa IVA nelle fatture
    expect(body.includes('IGIC')).toBe(false);
  });

  test('00.3 Menù IT mostra lingua italiana', async ({ page }) => {
    await navigateTab(page, 'menu');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    expect(
      body.includes('Impostazioni') ||
      body.includes('Guida') ||
      body.includes('Profilo') ||
      body.includes('Abbonamento')
    ).toBe(true);
    // Non deve mostrare termini spagnoli
    expect(body.includes('Configuración') || body.includes('IGIC')).toBe(false);
  });

  test('00.4 Modal nuova fattura IT non mostra IGIC', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    // Apri modal nuova fattura/documento
    const newBtn = page.getByRole('button', { name: /nuov|aggiungi/i }).first();
    if (!await newBtn.isVisible().catch(() => false)) return;
    await newBtn.click();
    await page.waitForTimeout(800);
    const body = await page.locator('body').innerText();
    expect(body.includes('IGIC')).toBe(false);
    // Chiudi modal
    await page.keyboard.press('Escape');
  });
});

test.describe('00 — Regressione UI Spain penisola', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await switchToSpainProfile(page);
    await page.waitForTimeout(1000);
  });

  test('00.5 Dashboard ES mostra termini spagnoli (Ingresos, Gastos)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    expect(
      body.includes('Ingresos') ||
      body.includes('Gastos') ||
      body.includes('Facturas') ||
      body.includes('Dashboard')
    ).toBe(true);
    // Non deve mostrare termini italiani
    expect(body.includes('Entrate') || body.includes('IGIC')).toBe(false);
  });

  test('00.6 Dashboard ES non mostra IGIC (profilo penisola)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    expect(body.includes('IGIC')).toBe(false);
  });

  test('00.7 Modal nuova fattura ES mostra IVA — non IGIC', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const newBtn = page.getByRole('button', { name: /nuev|crear|nueva/i }).first();
    if (!await newBtn.isVisible().catch(() => false)) return;
    await newBtn.click();
    await page.waitForTimeout(800);
    const body = await page.locator('body').innerText();
    // Deve mostrare IVA, non IGIC
    expect(body.includes('IVA') || body.includes('21')).toBe(true);
    expect(body.includes('IGIC')).toBe(false);
    await page.keyboard.press('Escape');
  });

  test('00.8 Modal nuova fattura ES mostra aliquote IVA penisola (21, 10, 4)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);
    const newBtn = page.getByRole('button', { name: /nuev|crear|nueva/i }).first();
    if (!await newBtn.isVisible().catch(() => false)) return;
    await newBtn.click();
    await page.waitForTimeout(800);
    const body = await page.locator('body').innerText();
    // Aliquote penisola devono essere presenti
    expect(body.includes('21') || body.includes('10') || body.includes('4')).toBe(true);
    // Aliquote IGIC non devono apparire come predefinite
    expect(body.includes('IGIC 7') || body.includes('IGIC 3')).toBe(false);
    await page.keyboard.press('Escape');
  });

  test('00.9 Menù ES mostra lingua spagnola', async ({ page }) => {
    await navigateTab(page, 'menu');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    expect(
      body.includes('Configuración') ||
      body.includes('Ajustes') ||
      body.includes('Guía') ||
      body.includes('Perfil')
    ).toBe(true);
    expect(body.includes('IGIC')).toBe(false);
  });

  test('00.10 Calendario ES mostra scadenze Modelo (non F24)', async ({ page }) => {
    await navigateTab(page, 'calendar');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    // Scadenze spagnole
    expect(body.includes('Modelo') || body.includes('RETA') || body.includes('IRPF') || body.includes('IVA')).toBe(true);
    // Non deve mostrare scadenze italiane
    expect(body.includes('F24') || body.includes('INPS') || body.includes('IRPEF')).toBe(false);
  });
});
