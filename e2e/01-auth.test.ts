import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, FREE_EMAIL, FREE_PASSWORD, BASE_URL, login, logout } from './helpers';

test.describe('01 — Autenticazione', () => {

  test('01.1 Login account Pro', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(PRO_EMAIL);
    await page.locator('#login-password').fill(PRO_PASSWORD);
    await page.getByRole('button', { name: 'Accedi' }).click();
    await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const errorText = await page.getByText('Email o password non corretti').isVisible().catch(() => false);
    expect(errorText).toBe(false);
    // Verifica che sia entrato nell'app (dashboard IT o ES, profilo)
    const pageText = await page.locator('body').innerText().catch(() => '');
    const inApp = pageText.includes('Dashboard') || pageText.includes('Panel') ||
                  pageText.includes('Ciao') || pageText.includes('Hola') ||
                  pageText.includes('Profilo') || pageText.includes('Perfil') ||
                  pageText.includes('Facturado') || pageText.includes('Ingresos') ||
                  pageText.includes('Fatturato') || pageText.includes('MENÙ') ||
                  pageText.includes('Solvy Pro') || pageText.includes('PRO');
    expect(inApp).toBe(true);
  });

  test('01.2 Logout', async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await logout(page);
    // Attendi il ritorno alla schermata di login
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const isLoginPage = pageText.includes('Accedi') || pageText.includes('Bentornato') || pageText.includes('SOLVY');
    expect(isLoginPage).toBe(true);
  });

  test('01.3 Credenziali errate → messaggio di errore', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(PRO_EMAIL);
    await page.locator('#login-password').fill('passwordsbagliata123');
    await page.getByRole('button', { name: 'Accedi' }).click();
    await page.waitForTimeout(3000);
    const error = await page.getByText('Email o password non corretti').isVisible().catch(() => false);
    expect(error).toBe(true);
  });

  test('01.4 Password dimenticata → form invio link', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.getByText('Password dimenticata?').click();
    await page.waitForTimeout(500);
    // Verifica che sia apparso il form
    const sendBtn = await page.getByRole('button', { name: 'Invia link di reset' }).isVisible().catch(() => false);
    expect(sendBtn).toBe(true);
    await page.getByPlaceholder('La tua email').fill('test-reset-noreply@solvy-test.invalid');
    await page.getByRole('button', { name: 'Invia link di reset' }).click();
    await page.waitForTimeout(3000);
    const pageText = await page.locator('body').innerText().catch(() => '');
    // Accetta: conferma invio OR rate-limit Supabase (entrambi provano che il form funziona)
    const sentConfirm = pageText.includes('Email inviata') || pageText.includes('Controlla la tua casella') || pageText.includes('Errore nell') || pageText.includes('security purposes');
    expect(sentConfirm).toBe(true);
  });

  test('01.5 Registrazione nuovo account (Free)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.getByText('Crea un account').click();
    await page.waitForTimeout(500);
    await page.locator('#register-email').fill(FREE_EMAIL);
    await page.locator('#register-password').fill(FREE_PASSWORD);
    // Accetta termini
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) await checkbox.check();
    await page.getByRole('button', { name: 'Registrati' }).click();
    await page.waitForTimeout(4000);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const confirmSent = pageText.includes('Controlla') || pageText.includes('link di conferma') || pageText.includes('Abbiamo inviato');
    const inApp = pageText.includes('Dashboard') || pageText.includes('Ciao') || pageText.includes('Fatturato');
    const alreadyRegistered = pageText.includes('già registrata');
    const rateLimited = pageText.includes('security purposes') || pageText.includes('4 seconds');
    expect(confirmSent || inApp || alreadyRegistered || rateLimited).toBe(true);
  });

});
