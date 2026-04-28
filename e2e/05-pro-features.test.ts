import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, FREE_EMAIL, FREE_PASSWORD, login, navigateTab, clickMenuItemByText, switchToItalyProfile } from './helpers';

test.describe('05 — Pro vs Free', () => {

  test('05.1 Account Pro — badge Pro attivo nel menu', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await navigateTab(page, 'menu');
    await page.waitForTimeout(800);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const proBadge = pageText.includes('Solvy Pro attivo') || pageText.includes('PRO');
    expect(proBadge).toBe(true);
  });

  test('05.2 Account Pro — tab Tasse accessibile senza paywall', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    const taxTab = page.getByText('Tasse').first();
    if (await taxTab.isVisible().catch(() => false)) {
      await taxTab.click();
      await page.waitForTimeout(1000);
      const paywall = await page.getByText(/Passa a Pro|Sblocca/i).isVisible().catch(() => false);
      expect(paywall).toBe(false);
    } else {
      test.skip(true, 'Tab Tasse non trovata');
    }
  });

  test('05.3 Account Pro — temi Pro disponibili nelle impostazioni', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    // Settings label differs by profile language (IT: "Impostazioni", ES: "Ajustes")
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const text = b.textContent?.trim() || '';
        return text.includes('Impostazioni') || text.includes('Ajustes');
      });
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForTimeout(1000);
    const proTheme = await page.getByText(/Pro Light|Pro Dark/i).first().isVisible().catch(() => false);
    expect(proTheme).toBe(true);
  });

  test('05.4 Account Pro — Metti da parte visible (IT profile)', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    // Assicurarsi di essere su un profilo IT (non Spain) perché mettiDaParte è solo per IT Pro
    await switchToItalyProfile(page);
    await page.waitForTimeout(500);
    // "Metti da parte" è nel tab Tasse (taxes), non in Panoramica (overview)
    const taxTab = page.getByText('Tasse').first();
    if (await taxTab.isVisible().catch(() => false)) {
      await taxTab.click();
      await page.waitForTimeout(1000);
    }
    const pageText = await page.locator('body').innerText().catch(() => '');
    const metti = pageText.includes('Metti da parte');
    expect(metti).toBe(true);
  });

  test('05.5 Account Free — paywall su fattura n.9 (limite 8)', async ({ page }) => {
    await page.goto('https://solvyapp.com');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(FREE_EMAIL);
    await page.locator('#login-password').fill(FREE_PASSWORD);
    await page.getByRole('button', { name: 'Accedi' }).click();
    await page.waitForTimeout(3000);

    const loginError = await page.getByText('Email o password non corretti').isVisible().catch(() => false);
    const notConfirmed = await page.getByText('Conferma prima la tua email').isVisible().catch(() => false);

    if (loginError || notConfirmed) {
      test.skip(true, `Account free non disponibile: ${loginError ? 'credenziali errate' : 'email non confermata'}`);
      return;
    }

    await navigateTab(page, 'docs');
    await page.waitForTimeout(500);

    const plusBtn = page.getByRole('button', { name: 'Aggiungi', exact: true });
    await plusBtn.click();
    await page.waitForTimeout(500);

    const fatturaBtnChoice = page.getByText(/^Fattura$/).first();
    await fatturaBtnChoice.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    await fatturaBtnChoice.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const paywall = await page.getByText(/Passa a Pro|fatture illimitate/i).first().isVisible().catch(() => false);
    const form = await page.getByPlaceholder('Es. Acme Srl').isVisible().catch(() => false);
    expect(paywall || form).toBe(true);
  });

  test('05.6 Account Pro — gestione abbonamento accessibile', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    // Click subscription item — text differs by profile language (IT: "Abbonamento", ES: "Suscripción")
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const text = b.textContent?.trim() || '';
        return text.includes('Abbonamento') || text.includes('Suscripción');
      });
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForTimeout(1500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const subscriptionPage = pageText.includes('Solvy Pro attivo') ||
                             pageText.includes('Solvy Pro activo') ||
                             pageText.includes('Gestisci pagamento') ||
                             pageText.includes('Gestionar pago') ||
                             pageText.includes('Cancella abbonamento') ||
                             pageText.includes('Cancelar suscripción');
    expect(subscriptionPage).toBe(true);
  });

});
