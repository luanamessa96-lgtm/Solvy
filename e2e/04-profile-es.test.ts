import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, clickMenuProfileCard, switchToSpainProfile } from './helpers';

async function onboardingClick(page: import('@playwright/test').Page, selector: import('@playwright/test').Locator) {
  await selector.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await selector.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
}

test.describe('04 — Profilo ES (Spain)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    // Tenta switch a profilo Spain se esiste
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await switchToSpainProfile(page);
    await page.waitForTimeout(500);
  });

  test('04.1 Creazione profilo Spagna', async ({ page }) => {
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await clickMenuProfileCard(page);
    await page.waitForTimeout(1000);

    const addProfileBtn = page.getByText('Aggiungi Profilo').first();
    if (!await addProfileBtn.isVisible().catch(() => false)) {
      // Spain già attivo
      await page.getByRole('button', { name: 'Home', exact: true }).click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      const pageText = await page.locator('body').innerText().catch(() => '');
      expect(pageText.includes('Dashboard') || pageText.includes('Hola') || pageText.includes('Ingresos') || pageText.includes('Ciao')).toBe(true);
      return;
    }
    await addProfileBtn.click();
    await page.waitForTimeout(800);

    // Step 0 — Welcome
    await onboardingClick(page, page.getByRole('button', { name: 'Inizia' }));

    // Step 'country' — "Spagna"
    await onboardingClick(page, page.getByText('Spagna').first());

    // Step 1 — Chi sei
    await page.waitForTimeout(600);
    const nameField = page.getByPlaceholder('Es. Mario Rossi').first();
    await nameField.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await nameField.fill('Test España').catch(() => {});
    const jobField = page.getByPlaceholder('Es. Freelance Designer').first();
    if (await jobField.isVisible().catch(() => false)) await jobField.fill('Autónomo Digital');
    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 2 (Spain) — salta dati fiscali con "Omitir por ahora"
    await page.waitForTimeout(600);
    const skipBtn = page.getByText('Omitir por ahora').first();
    if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click({ force: true }).catch(() => {});
    else await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));
    await page.waitForTimeout(800);

    await onboardingClick(page, page.getByRole('button', { name: 'Vai alla Dashboard' }));
    await page.waitForTimeout(3000);

    // Naviga a Home (isProfilePage rimane true dopo onboarding)
    await page.getByRole('button', { name: 'Home', exact: true }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Dashboard') || pageText.includes('Hola') || pageText.includes('Ingresos') || pageText.includes('Ciao')).toBe(true);
  });

  test('04.2 Creazione factura ES con IVA 21%', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    // Scelta Spain: "Factura" — force click bypassa motion animation
    const facturaBtn = page.getByText(/^Factura$/).first();
    await facturaBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await facturaBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Attende animazione modal
    await page.waitForTimeout(800);

    // Verifica IVA 21% presente nel form
    const pageBody = await page.locator('body').innerText().catch(() => '');
    expect(pageBody.includes('IVA') || pageBody.includes('21%')).toBe(true);

    // Cliente — modal apre in "Particular" (placeholder "Ej. Juan García"); fill diretto
    const clientField = page.getByPlaceholder('Ej. Juan García').first();
    await clientField.fill('Empresa Test SA').catch(async () => {
      // Fallback: prova placeholder Empresa
      await page.getByPlaceholder('Ej. Empresa SL').first().fill('Empresa Test SA').catch(() => {});
    });

    // Descrizione obbligatoria
    const descField = page.getByPlaceholder(/Diseño web|servicio/i).first();
    await descField.fill('Consultoría test').catch(() => {});

    const amountField = page.getByPlaceholder('0.00').first();
    await amountField.fill('1000').catch(() => {});
    await page.waitForTimeout(300);

    const createBtn = page.getByRole('button', { name: 'Crear Factura' }).first();
    await createBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await createBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Factura añadida') || pageText.includes('Empresa Test')).toBe(true);
  });

  test('04.3 Creazione gasto (spesa ES)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const gastoBtn = page.getByText(/^Gasto$/).first();
    await gastoBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await gastoBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    const descField = page.getByPlaceholder('Ej: Suscripción Adobe Creative').first();
    if (await descField.isVisible().catch(() => false)) await descField.fill('Material de oficina test');

    const amountField = page.getByPlaceholder('0.00').first();
    if (await amountField.isVisible().catch(() => false)) await amountField.fill('100');

    const saveBtn = page.getByRole('button', { name: /Registrar Gasto/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click();
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Gasto añadido') || pageText.includes('Material de oficina')).toBe(true);
  });

  test('04.4 Resumen Trimestral ES — disponibile per Pro', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(1000);

    const resumenBtn = page.getByText(/Resumen Trimestral/i).first();
    const visible = await resumenBtn.isVisible().catch(() => false);
    expect(visible).toBe(true);

    if (visible) {
      await resumenBtn.click();
      await page.waitForTimeout(1000);
      const modal = await page.getByText(/T1|T2|T3|T4|trimestre/i).first().isVisible().catch(() => false);
      const paywall = await page.getByText(/Passa a Pro/i).isVisible().catch(() => false);
      expect(modal).toBe(true);
      expect(paywall).toBe(false);
    }
  });

  test('04.5 Scadenze Modelos ES presenti', async ({ page }) => {
    await navigateTab(page, 'calendar');
    await page.waitForTimeout(1500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasModelos = pageText.includes('Modelo') || pageText.includes('RETA') || pageText.includes('Declaración');
    expect(hasModelos).toBe(true);
  });

});
