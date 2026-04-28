import { test } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, dismissPWABanner } from './helpers';

test('DEBUG — stato dopo click Menù', async ({ page }) => {
  await page.goto('https://solvyapp.com');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(PRO_EMAIL);
  await page.locator('#login-password').fill(PRO_PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.waitForTimeout(3000);
  await dismissPWABanner(page);

  await page.screenshot({ path: 'e2e/screenshots/after-login.png' });

  // Conta tutti i bottoni con aria-label
  const buttons = await page.locator('[aria-label]').all();
  console.log('Tutti gli aria-label:');
  for (const btn of buttons) {
    const label = await btn.getAttribute('aria-label').catch(() => '');
    const visible = await btn.isVisible().catch(() => false);
    if (label) console.log(`  aria-label="${label}" visible=${visible}`);
  }

  // Clicca Menù
  const menuBtn = page.getByRole('button', { name: 'Menù' });
  console.log('\nMenù count:', await menuBtn.count());
  console.log('Menù visible:', await menuBtn.isVisible().catch(() => false));
  await menuBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'e2e/screenshots/after-menu-click.png' });
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('\nPrime 800 chars dopo click Menù:\n', bodyText.substring(0, 800));
});
