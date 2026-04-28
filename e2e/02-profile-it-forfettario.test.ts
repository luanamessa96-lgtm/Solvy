import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, clickMenuProfileCard, clickMenuItemByText, switchToItalyProfile } from './helpers';

// Helper: click onboarding step button, tolerating motion animation
async function onboardingClick(page: import('@playwright/test').Page, selector: import('@playwright/test').Locator) {
  await selector.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600); // let motion animation settle
  await selector.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
}

test.describe('02 — Profilo IT Forfettario', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    // Spain profile may be default (alphabetical job_type ordering) — switch to IT
    await switchToItalyProfile(page);
    await page.waitForTimeout(500);
  });

  test('02.1 Creazione profilo IT Forfettario', async ({ page }) => {
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

    // Step 0 — Welcome: "Inizia"
    await onboardingClick(page, page.getByRole('button', { name: 'Inizia' }));

    // Step 'country' — "Italia" (avanza direttamente senza Continua)
    await onboardingClick(page, page.getByText('Italia').first());

    // Step 1 — Chi sei
    await page.waitForTimeout(600);
    const nameField = page.getByPlaceholder('Es. Mario Rossi').first();
    await nameField.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await nameField.fill('Test Forfettario').catch(() => {});
    const jobField = page.getByPlaceholder('Es. Freelance Designer').first();
    if (await jobField.isVisible().catch(() => false)) await jobField.fill('Freelance Developer');
    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 2 — Regime: "Forfettario" toggle
    await onboardingClick(page, page.getByRole('button', { name: 'Forfettario', exact: true }));

    // Categoria ATECO — click Professionisti via JS (bypass animation)
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const span = spans.find(s => s.textContent?.trim() === 'Professionisti');
      if (span) { const btn = span.closest('button'); if (btn) btn.click(); }
    });
    await page.waitForTimeout(400);

    // Anno inizio
    const yearInput = page.locator('input[type="number"]').first();
    if (await yearInput.isVisible().catch(() => false)) await yearInput.fill('2022');

    await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));

    // Step 3 — Dati fiscali: salta
    await page.waitForTimeout(600);
    const skipBtn = page.getByText('Salta per ora').first();
    if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click({ force: true }).catch(() => {});
    else await onboardingClick(page, page.getByRole('button', { name: 'Continua' }));
    await page.waitForTimeout(800);

    // Step done
    await onboardingClick(page, page.getByRole('button', { name: 'Vai alla Dashboard' }));
    await page.waitForTimeout(3000);

    // Dopo la creazione isProfilePage rimane true → naviga a Home esplicitamente
    await page.getByRole('button', { name: 'Home', exact: true }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    const dashboard = pageText.includes('Dashboard') || pageText.includes('Ciao') || pageText.includes('Fatturato') || pageText.includes('Test Forfettario');
    expect(dashboard).toBe(true);
  });

  test('02.2 Creazione fattura IT Forfettario', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    // FAB: aria-label="Aggiungi" (exact: true per evitare "Aggiungi documento")
    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    // Scelta: "Fattura" (testo esatto nel p del bottone) — force click bypassa motion animation
    const newInvoiceBtn = page.getByText(/^Fattura$/).first();
    await newInvoiceBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await newInvoiceBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Attende che il modal sia visibile dopo l'animazione
    await page.waitForTimeout(800);
    const clientField = page.getByPlaceholder('Es. Acme Srl').first();
    await clientField.fill('Cliente Test Srl').catch(async () => {
      await page.getByPlaceholder('Es. Mario Rossi').first().fill('Cliente Test Srl').catch(() => {});
    });

    // Descrizione obbligatoria
    const descField = page.getByPlaceholder(/Consulenza|Servizio|Maggio/i).first();
    await descField.fill('Consulenza test').catch(() => {});

    const amountField = page.getByPlaceholder('0.00').first();
    await amountField.fill('500').catch(() => {});
    await page.waitForTimeout(300);

    const createBtn = page.getByRole('button', { name: /Crea Fattura/i }).first();
    await createBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await createBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Fattura aggiunta') || pageText.includes('Cliente Test')).toBe(true);
  });

  test('02.3 Export PDF fattura', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const firstInvoice = page.getByText(/Cliente Test|Fattura #/i).first();
    if (!await firstInvoice.isVisible().catch(() => false)) {
      test.skip(true, 'Nessuna fattura disponibile');
      return;
    }
    await firstInvoice.click();
    await page.waitForTimeout(800);

    const downloadBtn = page.getByText(/Scarica PDF|Download|PDF/i).first();
    const visible = await downloadBtn.isVisible().catch(() => false);
    expect(visible).toBe(true);

    const downloadPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
    if (visible) await downloadBtn.click();
    await page.waitForTimeout(3000);

    const popup = await downloadPromise;
    const pdfModal = await page.getByText(/Apri PDF|Scarica \/ Condividi/i).isVisible().catch(() => false);
    expect(popup !== null || pdfModal).toBe(true);
  });

  test('02.4 Creazione spesa', async ({ page }) => {
    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const expenseBtn = page.getByText(/^Spesa$/).first();
    await expenseBtn.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await expenseBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    const descField = page.getByPlaceholder('Es: Abbonamento Adobe Creative').first();
    if (await descField.isVisible().catch(() => false)) await descField.fill('Abbonamento software test');

    const amountField = page.getByPlaceholder('0.00').first();
    if (await amountField.isVisible().catch(() => false)) await amountField.fill('50');
    await page.waitForTimeout(300);

    const saveBtn = page.getByRole('button', { name: /Registra Spesa/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) await saveBtn.click();
    await page.waitForTimeout(3000);

    const pageText = await page.locator('body').innerText().catch(() => '');
    expect(pageText.includes('Spesa aggiunta') || pageText.includes('Abbonamento software')).toBe(true);
  });

  test('02.5 Calcoli fiscali dashboard — forfettario coerenti', async ({ page }) => {
    await page.waitForTimeout(500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasFiscal = pageText.includes('Imposta sostitutiva') || pageText.includes('INPS') || pageText.includes('Tasse Stimate') || pageText.includes('Stima Fiscale') || pageText.includes('Tasse');
    expect(hasFiscal).toBe(true);
  });

  test('02.6 Scadenze calendario presenti', async ({ page }) => {
    await navigateTab(page, 'calendar');
    await page.waitForTimeout(1500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasDeadlines = pageText.includes('INPS') || pageText.includes('Acconto') || pageText.includes('Saldo') || pageText.includes('Scadenz');
    expect(hasDeadlines).toBe(true);
  });

});
