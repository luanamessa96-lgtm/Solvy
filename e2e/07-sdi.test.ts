import { test, expect } from '@playwright/test';
import { PRO_EMAIL, PRO_PASSWORD, login, navigateTab, switchToItalyProfile } from './helpers';

const SDI_SEND_URL = '**/functions/v1/sdi-send';

async function openExportModal(page: import('@playwright/test').Page) {
  await navigateTab(page, 'docs');
  await page.waitForTimeout(1200);
  // motion.button non è intercettabile via getByText — usa evaluate come gli altri test
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Invia documenti'));
    if (btn) { (btn as HTMLElement).click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('Bottone "Invia documenti" non trovato');
  await page.waitForTimeout(1200);
}

async function clickSdiSendButton(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => /Invia \d+ fattura/.test(b.textContent || ''));
    if (btn) (btn as HTMLElement).click();
  });
}

test.describe('07 — SdI (fatturazione elettronica IT)', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await login(page, PRO_EMAIL, PRO_PASSWORD);
    await page.waitForTimeout(2000);
    await switchToItalyProfile(page);
    await page.waitForTimeout(500);
  });

  test('07.1 Modal Esporta — sezione SdI visibile per profilo IT Pro', async ({ page }) => {
    await openExportModal(page);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasSdi = pageText.includes('Invia a SdI') && pageText.includes('AdE');
    expect(hasSdi).toBe(true);
  });

  test('07.2 Bottone SdI — testo singolare/plurale corretto', async ({ page }) => {
    await openExportModal(page);
    await page.waitForTimeout(500);
    const pageText = await page.locator('body').innerText().catch(() => '');
    const match = pageText.match(/Invia (\d+) (fattura|fatture) a SdI/);
    if (!match) {
      test.skip(true, 'Bottone SdI non trovato');
      return;
    }
    const n = parseInt(match[1], 10);
    const word = match[2];
    // 1 → "fattura", qualsiasi altro numero (incluso 0) → "fatture"
    expect(word).toBe(n === 1 ? 'fattura' : 'fatture');
  });

  test('07.3 Invio SdI — errori A-Cube mostrati per fattura (mock 502)', async ({ page }) => {
    await page.route(SDI_SEND_URL, route =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Errore A-Cube: 422',
          detail: JSON.stringify({
            violations: [{ propertyPath: 'cessionario_committente.sede.comune', message: 'Il comune è obbligatorio' }],
          }),
        }),
      })
    );

    await openExportModal(page);
    await page.waitForTimeout(500);

    const initialText = await page.locator('body').innerText().catch(() => '');
    if (!/Invia \d+ fattura[e]? a SdI/.test(initialText)) {
      test.skip(true, 'Nessuna fattura da inviare');
      return;
    }

    await clickSdiSendButton(page);

    await page.waitForFunction(
      () => document.body.innerText.includes('inviate'),
      { timeout: 15000 }
    ).catch(() => {});

    const afterText = await page.locator('body').innerText().catch(() => '');
    // Il box risultati deve essere visibile
    expect(afterText).toMatch(/\d+ inviate/);
    // Almeno un dato incompleto o errore dalla risposta A-Cube
    const hasError = afterText.includes('dato incompleto') || afterText.includes('dati incompleti') || afterText.includes('comune');
    expect(hasError).toBe(true);
  });

  test('07.4 Invio bulk SdI — contatore si azzera senza chiudere modal (mock 200)', async ({ page }) => {
    await page.route(SDI_SEND_URL, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, sdi_id: 'mock-sdi-uuid-e2e' }),
      })
    );

    await openExportModal(page);
    await page.waitForTimeout(500);

    const initialText = await page.locator('body').innerText().catch(() => '');
    const match = initialText.match(/Invia (\d+) fattura[e]? a SdI/);
    if (!match || parseInt(match[1], 10) === 0) {
      test.skip(true, 'Nessuna fattura da inviare per testare il refresh del contatore');
      return;
    }
    const initialCount = parseInt(match[1], 10);

    await clickSdiSendButton(page);

    await page.waitForFunction(
      () => document.body.innerText.includes('inviate'),
      { timeout: 15000 }
    ).catch(() => {});

    const afterText = await page.locator('body').innerText().catch(() => '');

    // ✓ Il modal è ancora aperto
    expect(afterText.includes('Invia a SdI') || afterText.includes('Esporta')).toBe(true);

    // ✓ Il box risultati è visibile con il conteggio
    expect(afterText).toMatch(/\d+ inviate/);

    // ✓ Le fatture inviate via mock (quelle che passano validateForSdi) spariscono dal contatore
    const sentMatch = afterText.match(/(\d+) inviate/);
    const sentCount = sentMatch ? parseInt(sentMatch[1], 10) : 0;
    if (sentCount > 0) {
      const expectedCount = initialCount - sentCount;
      const expectedText = expectedCount === 1 ? 'Invia 1 fattura a SdI' : `Invia ${expectedCount} fatture a SdI`;
      expect(afterText).toContain(expectedText);
    }
  });

  test('07.5 Modal Esporta — sezione SdI assente per profilo Spain', async ({ page }) => {
    // beforeEach already switched to Italy — we need to switch to Spain via ProfileView
    await navigateTab(page, 'menu');
    await page.waitForTimeout(500);
    const switched = await page.evaluate(() => {
      // First find profile card button (rounded-[32px]) to open ProfileView
      const profileCard = Array.from(document.querySelectorAll('button'))
        .find(b => b.className.includes('rounded-[32px]'));
      if (profileCard) (profileCard as HTMLElement).click();
      return !!profileCard;
    });
    if (!switched) {
      test.skip(true, 'Nessun profilo disponibile nel menu');
      return;
    }
    await page.waitForTimeout(800);
    const spainSwitched = await page.evaluate(() => {
      // After beforeEach, IT is active (border-primary). Spain = the non-active profile button.
      const spainBtn = Array.from(document.querySelectorAll('button')).find(b => {
        const cls = b.className || '';
        const tokens = cls.split(/\s+/);
        const text = b.textContent?.trim() || '';
        return cls.includes('rounded-2xl') &&
               !cls.includes('border-dashed') &&
               !tokens.includes('border-primary') &&
               text.length > 3 &&
               !text.includes('Aggiungi');
      });
      if (spainBtn) { (spainBtn as HTMLElement).click(); return true; }
      return false;
    });
    if (!spainSwitched) {
      test.skip(true, 'Nessun profilo Spain disponibile');
      return;
    }
    await page.waitForTimeout(1500);

    await navigateTab(page, 'docs');
    await page.waitForTimeout(800);

    // Per Spain la card "Invia documenti" è nascosta (solo profili IT hanno ExportModal)
    const hasInviaDocs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).some(b => b.textContent?.includes('Invia documenti'))
    );
    expect(hasInviaDocs).toBe(false);
  });
});
