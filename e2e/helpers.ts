import { Page } from '@playwright/test';

export const PRO_EMAIL = process.env.TEST_PRO_EMAIL ?? '';
export const PRO_PASSWORD = process.env.TEST_PRO_PASSWORD ?? '';
export const FREE_EMAIL = process.env.TEST_FREE_EMAIL ?? '';
export const FREE_PASSWORD = process.env.TEST_FREE_PASSWORD ?? '';
export const BASE_URL = 'https://solvyapp.com';

export async function login(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Se già loggato, fai logout prima
  const logoutVisible = await page.getByText('Logout').isVisible().catch(() => false);
  if (logoutVisible) await logout(page);

  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  // Attendi che sparisca il form di login
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

export async function dismissPWABanner(page: Page) {
  // "Ignora" (IT) / "Ignorar" (ES) — both PWA install banner and update notification
  const ignora = page.getByRole('button', { name: /^Ignora(r)?$/ });
  if (await ignora.isVisible().catch(() => false)) {
    await ignora.click();
    await page.waitForTimeout(500);
  }
}

export async function logout(page: Page) {
  await dismissPWABanner(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Menù' }).click();
  await page.waitForTimeout(1000);
  // Dismissi il banner PWA che riappare nel menu
  await dismissPWABanner(page);
  await page.waitForTimeout(300);
  // Clicca Logout / Cerrar sesión via JS (gestisce IT e ES)
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('span, button, div'))
      .find(e => (e.textContent?.trim() === 'Logout' || e.textContent?.trim() === 'Cerrar sesión') && (e as HTMLElement).style?.display !== 'none');
    if (el) (el as HTMLElement).click();
  });
  await page.waitForTimeout(500);
  // Conferma nel modal via JS — IT: "Sì, Esci", ES: "Sí, Salir"
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Sì, Esci' || b.textContent?.trim() === 'Sí, Salir');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);
}

export async function navigateTab(page: Page, tab: 'docs' | 'calendar' | 'menu') {
  await dismissPWABanner(page);
  const ariaLabels: Record<string, string> = { docs: 'Doc', calendar: 'Cal', menu: 'Menù' };
  await page.getByRole('button', { name: ariaLabels[tab], exact: true }).click();
  await page.waitForTimeout(800);
}

/** Click the profile card in MenuView to open ProfileView.
 *  Menu items are CSS-hidden to Playwright → must use JS evaluate.
 *  Assumes the Menù tab is already open. */
export async function clickMenuProfileCard(page: Page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.className.includes('rounded-[32px]'));
    if (btn) (btn as HTMLElement).click();
  });
  await page.waitForTimeout(800);
}

/** Click a menu item in MenuView by its visible text.
 *  Menu buttons are CSS-hidden to Playwright → must use JS evaluate.
 *  Assumes the Menù tab is already open. */
export async function clickMenuItemByText(page: Page, text: string) {
  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => {
        const spans = b.querySelectorAll('span');
        return [...spans].some(s => s.textContent?.trim() === t) ||
               b.textContent?.trim() === t;
      });
    if (btn) (btn as HTMLElement).click();
  }, text);
  await page.waitForTimeout(800);
}

/** Try to switch to an Italy profile in ProfileView.
 *  Navigates to Menù, opens ProfileView, clicks the first IT profile found.
 *  Returns true if switched, false if no Italy profile found. */
export async function switchToItalyProfile(page: Page): Promise<boolean> {
  await navigateTab(page, 'menu');
  await page.waitForTimeout(500);
  await clickMenuProfileCard(page);
  await page.waitForTimeout(800);
  const switched = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const italyBtn = btns.find(b => {
      const text = b.textContent || '';
      return (text.includes('Freelance') || text.includes('Consulente') || text.includes('Designer') || text.includes('Ordinario') || text.includes('Forfettario')) &&
             !text.includes('Autónomo') && !text.includes('España');
    });
    if (italyBtn) { (italyBtn as HTMLElement).click(); return true; }
    return false;
  });
  if (switched) {
    await page.waitForTimeout(1500); // handleSwitchProfile navigates to home
  } else {
    await page.getByRole('button', { name: 'Torna indietro' }).click().catch(() => {});
    await page.waitForTimeout(500);
  }
  return switched;
}

/** Try to switch to a Spain profile in ProfileView.
 *  Returns true if switched, false if no Spain profile found.
 *  Assumes the Menù tab is already open. */
export async function switchToSpainProfile(page: Page): Promise<boolean> {
  await clickMenuProfileCard(page);
  await page.waitForTimeout(800);
  const switched = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const spainBtn = btns.find(b =>
      b.textContent?.includes('Test España') ||
      b.textContent?.includes('Autónomo') ||
      b.textContent?.includes('España')
    );
    if (spainBtn) { (spainBtn as HTMLElement).click(); return true; }
    return false;
  });
  if (switched) {
    await page.waitForTimeout(1500); // handleSwitchProfile navigates to home
  } else {
    // Go back from ProfileView to previous state
    await page.getByRole('button', { name: 'Torna indietro' }).click().catch(() => {});
    await page.waitForTimeout(500);
  }
  return switched;
}
