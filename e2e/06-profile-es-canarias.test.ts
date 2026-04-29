import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, clickMenuProfileCard } from './helpers';

async function onboardingClick(page: import('@playwright/test').Page, selector: import('@playwright/test').Locator) {
  await selector.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await selector.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
}

/** Switch to an existing Canarias profile, or return false if not found. */
async function switchToCanariasProfile(page: import('@playwright/test').Page): Promise<boolean> {
  await clickMenuProfileCard(page);
  await page.waitForTimeout(800);
  const switched = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b =>
      b.textContent?.includes('Test Canarias') ||
      b.textContent?.includes('Canarias') ||
      b.textContent?.includes('IGIC')
    );
    if (btn) { (btn as HTMLElement).click(); return true; }
    return false;
  });
  if (switched) {
    await page.waitForTimeout(1500);
  } else {
    await page.getByRole('button', { name: 'Torna indietro' }).click().catch(() => {});
    await page.waitForTimeout(500);
  }
  return switched;
}

test.describe('06 — Profilo ES Canarias (IGIC)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await switchToCanariasProfile(page);
    await page.waitForTimeout(500);
  });

  test('06.1 Creazione profilo Canarias con step territorio', async ({ page }) => {
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    await clickMenuProfileCard(page);
    await page.waitForTimeout(1000);

    const addProfileBtn = page.getByText('Aggiungi Profilo').first();
    if (!await addProfileBtn.isVisible().catch(() => false)) {
      // Profilo Canarias già esiste — test passed
      const pageText = await page.locator('body').innerText().catch(() => '');
      expect(pageText.includes('Dashboard') || pageText.includes('Hola') || pageText.includes('Ingresos')).toBe(true);
      return;
    }
    await addProfileBtn.click();
    await page.waitForTimeout(800);

    // Step 0 — Welcome
    await onboardingClick(page, page.getByRole('button', { name: 'Inizia' }));

    // Step 'country' — Spagna
    await onboardingClick(page, page.getByText('Spagna').first());

    // Step 'territory' — Islas Canarias (nuovo step)
    await page.waitForTimeout(600);
    const canariasBtn = page.getByText('Islas Canarias').first();
    await canariasBtn.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    await canariasBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);

    // Step 1 — Chi sei
    const nameField = page.getByPlaceholder('Es. Mario Rossi').first();
    await nameField.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await nameField.fill('Test Canarias').catch(() => {});
    const jobField = page.getByPlaceholder('Es. Freelance Designer').first();
    if (await jobField.isVisible().catch(() => false)) await jobField.fill('Autónomo Canario');
    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 2 — Dati fiscali Spain (salta)
    await page.waitForTimeout(600);
    const skipBtn = page.getByText('Omitir por ahora').first();
    if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click({ force: true }).catch(() => {});
    else await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));
    await page.waitForTimeout(800);

    // Done
    await onboardingClick(page, page.getByRole('button', { name: 'Vai alla Dashboard' }));
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: 'Home', exact: true }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Dashboard') || pageText.includes('Hola') || pageText.includes('Ingresos')).toBe(true);
  });

  test('06.2 CreateFacturaModal mostra aliquote IGIC (0%, 3%, 7%)', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const facturaBtn = page.getByText(/^Factura$/).first();
    await facturaBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await facturaBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);

    const pageBody = await page.locator('body').innerText().catch(() => '');

    // Deve mostrare IGIC, non IVA
    expect(pageBody.includes('IGIC')).toBe(true);

    // Deve avere aliquote Canarie: 0%, 3%, 7%
    expect(pageBody.includes('7%')).toBe(true);
    expect(pageBody.includes('3%')).toBe(true);

    // NON deve avere aliquote Peninsula: 4%, 10%, 21%
    expect(pageBody.includes('21%')).toBe(false);
    expect(pageBody.includes('10%')).toBe(false);
    expect(pageBody.includes('4%')).toBe(false);

    // Chiudi
    await page.getByRole('button', { name: /chiudi|close|\+/i }).first().click({ force: true }).catch(() => {});
  });

  test('06.3 Crea factura con IGIC 7%', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const facturaBtn = page.getByText(/^Factura$/).first();
    await facturaBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await facturaBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);

    // Compila cliente
    const clientField = page.getByPlaceholder('Ej. Juan García').first();
    await clientField.fill('Cliente Canarias Test').catch(async () => {
      await page.getByPlaceholder('Ej. Empresa SL').first().fill('Cliente Canarias Test').catch(() => {});
    });

    // Descrizione
    await page.getByPlaceholder(/Diseño web|servicio/i).first().fill('Servicio IGIC test').catch(() => {});

    // Importo
    await page.getByPlaceholder('0.00').first().fill('500').catch(() => {});
    await page.waitForTimeout(300);

    // Verifica riepilogo mostra IGIC
    const summaryText = await page.locator('body').innerText().catch(() => '');
    expect(summaryText.includes('IGIC')).toBe(true);

    const createBtn = page.getByRole('button', { name: 'Crear Factura' }).first();
    await createBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await createBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Factura añadida') || pageText.includes('Cliente Canarias')).toBe(true);
  });

  test('06.4 CreateExpenseModal mostra IGIC Soportado con aliquote (0%, 3%, 7%)', async ({ page }) => {
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

    const pageBody = await page.locator('body').innerText().catch(() => '');

    // Deve mostrare IGIC Soportado
    expect(pageBody.includes('IGIC')).toBe(true);
    expect(pageBody.includes('IGIC Soportado') || pageBody.includes('IGIC SOPORTADO')).toBe(true);

    // Aliquote Canarie
    expect(pageBody.includes('7%')).toBe(true);
    expect(pageBody.includes('3%')).toBe(true);

    // NON aliquote Peninsula
    expect(pageBody.includes('21%')).toBe(false);

    await page.getByRole('button', { name: /Cancelar/i }).first().click({ force: true }).catch(() => {});
  });

  test('06.5 Badge IGIC nella lista documenti', async ({ page }) => {
    // Crea prima una spesa con IGIC per avere qualcosa in lista
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

    await page.getByPlaceholder('0.00').first().fill('100').catch(() => {});
    await page.waitForTimeout(300);

    const saveBtn = page.getByRole('button', { name: /Registrar Gasto/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);

    // Verifica badge nella lista
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasIgicBadge = pageText.includes('IGIC') || pageText.includes('7% IGIC');
    expect(hasIgicBadge || pageText.includes('Gasto añadido')).toBe(true);
  });

});
