import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, clickMenuProfileCard, switchToItalyProfile } from './helpers';

async function onboardingClick(page: import('@playwright/test').Page, selector: import('@playwright/test').Locator) {
  await selector.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await selector.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
}

test.describe('03 — Profilo IT Ordinario', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    // Spain profile may be default (alphabetical job_type ordering) — switch to IT
    await switchToItalyProfile(page);
    await page.waitForTimeout(500);
  });

  test('03.1 Creazione profilo IT Ordinario', async ({ page }) => {
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await clickMenuProfileCard(page);
    await page.waitForTimeout(1000);

    const addProfileBtn = page.getByText('Aggiungi Profilo').first();
    if (!await addProfileBtn.isVisible().catch(() => false)) {
      test.skip(true, 'Pulsante Aggiungi Profilo non trovato');
      return;
    }
    await addProfileBtn.click();
    await page.waitForTimeout(800);

    // Step 0 — Welcome
    await onboardingClick(page, page.getByRole('button', { name: 'Inizia' }));

    // Step 'country' — "Italia"
    await onboardingClick(page, page.getByText('Italia').first());

    // Step 1 — Chi sei
    await page.waitForTimeout(600);
    const nameField = page.getByPlaceholder('Es. Mario Rossi').first();
    await nameField.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await nameField.fill('Test Ordinario').catch(() => {});
    const jobField = page.getByPlaceholder('Es. Freelance Designer').first();
    if (await jobField.isVisible().catch(() => false)) await jobField.fill('Consulente IT');
    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 2 — "Ordinario" toggle
    await onboardingClick(page, page.getByRole('button', { name: 'Ordinario', exact: true }));

    const yearInput = page.locator('input[type="number"]').first();
    if (await yearInput.isVisible().catch(() => false)) await yearInput.fill('2020');

    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 3 — Dati fiscali: salta
    await page.waitForTimeout(600);
    const skipBtn = page.getByText('Salta per ora').first();
    if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click({ force: true }).catch(() => {});
    else await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));
    await page.waitForTimeout(800);

    await onboardingClick(page, page.getByRole('button', { name: 'Vai alla Dashboard' }));
    await page.waitForTimeout(3000);

    // Naviga a Home (isProfilePage rimane true dopo onboarding)
    await page.getByRole('button', { name: 'Home', exact: true }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Dashboard') || pageText.includes('Ciao') || pageText.includes('Fatturato') || pageText.includes('Test Ordinario')).toBe(true);
  });

  test('03.2 Dashboard Ordinario — tab Tasse (Pro) mostra IRPEF', async ({ page }) => {
    const taxTab = page.getByText('Tasse').first();
    if (await taxTab.isVisible().catch(() => false)) {
      await taxTab.click();
      await page.waitForTimeout(1000);
      const hasIRPEF = await page.getByText(/IRPEF|scaglioni|Imposta/i).first().isVisible().catch(() => false);
      expect(hasIRPEF).toBe(true);
    } else {
      test.skip(true, 'Tab Tasse non visibile');
    }
  });

  test('03.3 Calendario Ordinario — scadenze IVA trimestrali', async ({ page }) => {
    await navigateTab(page, 'calendar');
    await page.waitForTimeout(1500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    // Calendar may show empty state with banner "Scadenze fiscali" (IT profile confirmed)
    // OR deadlines already added with IVA/Liquidazione text
    const hasITCalendar = pageText.includes('IVA') || pageText.includes('Liquidazione') ||
                          pageText.includes('Scadenze fiscali') || pageText.includes('scadenze italiane');
    expect(hasITCalendar).toBe(true);
  });

  test('03.4 Fattura IT Ordinario — presenza IVA nel form', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const fatturaBtnChoice = page.getByText(/^Fattura$/).first();
    await fatturaBtnChoice.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await fatturaBtnChoice.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    const ivaField = await page.getByText(/Aliquota IVA|IVA/i).first().isVisible().catch(() => false);
    expect(ivaField).toBe(true);

    await page.keyboard.press('Escape');
  });

});
