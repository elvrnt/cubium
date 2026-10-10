import { expect, test, type Page } from '@playwright/test';
import { makeSolves } from '../src/test/solveFixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
});
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole('combobox', { name: 'Session', exact: true }),
  ).toBeEnabled();
}
async function create(page: Page, name: string) {
  await page
    .getByRole('button', { name: 'Manage sessions', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Manage sessions',
    exact: true,
  });
  await dialog
    .getByRole('button', { name: 'Create session', exact: true })
    .click();
  await dialog.getByRole('textbox', { name: 'Session name' }).fill(name);
  await dialog.getByRole('button', { name: 'Save session' }).click();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
}
async function solve(page: Page) {
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await expect(page.locator('.session-controls')).toBeHidden();
  await page.keyboard.press('a');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(
    page.getByRole('combobox', { name: 'Session', exact: true }),
  ).toBeEnabled();
}
test('two sessions isolate solves, retain scramble, reset result and Results filters, and survive reload', async ({
  page,
}) => {
  await ready(page);
  const select = page.getByRole('combobox', { name: 'Session', exact: true });
  const main = await select.inputValue();
  await solve(page);
  const scramble = await page.getByTestId('scramble').innerText();
  await create(page, 'Practice');
  const other = await select.inputValue();
  expect(other).not.toBe(main);
  await expect(page.getByRole('timer')).toHaveText('0.000');
  await expect(
    page.getByRole('button', { name: 'Note', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId('scramble')).toHaveText(scramble);
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
  await solve(page);
  await select.selectOption(main);
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await page.goto('/results?limit=all&ao5=0&ao12=1');
  await expect(page.getByRole('combobox', { name: 'Range' })).toHaveValue(
    'all',
  );
  await page
    .getByRole('combobox', { name: 'Session', exact: true })
    .selectOption(other);
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole('combobox', { name: 'Range' })).toHaveValue(
    '100',
  );
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Session', exact: true }),
  ).toHaveValue(other);
  await page.getByRole('link', { name: 'Timer', exact: true }).click();
  await expect(select).toHaveValue(other);
  await expect(page.getByRole('timer')).toHaveText('0.000');
});
test('rename, archive, restore and confirmed cascading deletion work with a protected last session', async ({
  page,
}) => {
  await ready(page);
  await create(page, 'Practice');
  await solve(page);
  await page
    .getByRole('button', { name: 'Manage sessions', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Manage sessions',
    exact: true,
  });
  let row = dialog
    .locator('.session-row')
    .filter({ has: page.locator('strong', { hasText: /^Practice$/ }) });
  await row.getByRole('button', { name: 'Rename' }).click();
  await dialog.getByRole('textbox').fill('Renamed');
  await dialog.getByRole('button', { name: 'Save session' }).click();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  row = dialog
    .locator('.session-row')
    .filter({ has: page.locator('strong', { hasText: /^Renamed$/ }) });
  await row.getByRole('button', { name: 'Archive' }).click();
  await expect(row.getByRole('button', { name: 'Restore' })).toBeEnabled();
  await row.getByRole('button', { name: 'Restore' }).click();
  await expect(row.getByRole('button', { name: 'Archive' })).toBeEnabled();
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  const confirmation = page.getByRole('dialog', {
    name: 'Delete session?',
    exact: true,
  });
  await expect(confirmation).toContainText('Solves: 1');
  await expect(
    confirmation.getByRole('button', { name: 'Cancel' }),
  ).toBeFocused();
  await confirmation
    .getByRole('button', { name: 'Delete session', exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(dialog.locator('.session-row')).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Archive' })).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
  await expect(
    page
      .getByRole('combobox', { name: 'Session', exact: true })
      .locator('option'),
  ).toHaveCount(1);
});
test('mouse selection returns focus to timing, keyboard selection stays native, and result editors block changes', async ({
  page,
}) => {
  await ready(page);
  const select = page.getByRole('combobox', { name: 'Session', exact: true });
  const main = await select.inputValue();
  await create(page, 'Practice');
  await select.dispatchEvent('pointerdown');
  await select.selectOption(main);
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await page.keyboard.press('a');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(select).toBeEnabled();
  await select.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toBeFocused();
  await select.selectOption(main);
  await page.getByTestId('recent-solve').getByRole('button').click();
  await expect(select).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(select).toBeEnabled();
});
test('failed session creation retains the name, retries without duplicate sessions and persists', async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    let fail = true;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'sessions' && fail) {
        fail = false;
        throw new DOMException('Full', 'QuotaExceededError');
      }
      return key === undefined
        ? original.call(this, value)
        : original.call(this, value, key);
    };
  });
  await page
    .getByRole('button', { name: 'Manage sessions', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Manage sessions',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Create session' }).click();
  await dialog.getByRole('textbox').fill('Retry session');
  await dialog.getByRole('button', { name: 'Save session' }).click();
  await expect(dialog.getByRole('textbox')).toHaveValue('Retry session');
  await dialog.getByRole('button', { name: 'Retry save' }).click();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await expect(dialog.locator('.session-row')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(
    page
      .getByRole('combobox', { name: 'Session', exact: true })
      .locator('option'),
  ).toHaveCount(2);
});
for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [390, 844],
  [320, 800],
  [640, 450],
  [320, 225],
] as const) {
  test(`sessions fit and management remains usable at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    await create(page, 'Сессия '.repeat(10));
    await expect(
      page.getByRole('combobox', { name: 'Session', exact: true }),
    ).toBeEnabled();
    await page.getByRole('combobox', { name: 'Language' }).selectOption('ru');
    await page
      .getByRole('button', { name: 'Управление сессиями', exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.impeccable/review/sessions-${width}-${height}.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Результаты', exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test('upgrades an existing v1 browser history without losing any source data', async ({
  page,
}) => {
  await page.goto('/cube-preview.html');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('CubeTrainerDB', 10);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('solves', {
          keyPath: 'id',
        });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('event', 'event');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('solves', 'readwrite');
      tx.objectStore('solves').add({
        id: 'legacy',
        event: '333',
        scramble: 'R U2',
        rawTimeMs: 12483,
        penalty: 'PLUS_TWO',
        note: 'Старая заметка',
        createdAt: '2026-10-05T00:00:00Z',
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/results');
  await expect(page.locator('.journal-time')).toHaveText('14.483+');
  await page.getByRole('button', { name: /Open solve/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Solve details', exact: true }),
  ).toContainText('Старая заметка');
});

test('10,000 solves across two sessions stay isolated with a bounded chart and reachable journal', async ({
  page,
}) => {
  await ready(page);
  const select = page.getByRole('combobox', { name: 'Session', exact: true });
  const main = await select.inputValue();
  await create(page, 'Large history');
  const other = await select.inputValue();
  const records = makeSolves(
    Array.from({ length: 10000 }, (_, i) => (i < 5000 ? 10000 : 20000)),
  ).map((solve, i) => ({ ...solve, sessionId: i < 5000 ? main : other }));
  await page.evaluate(async (records) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('CubeTrainerDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('solves', 'readwrite');
      for (const record of records) tx.objectStore('solves').put(record);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, records);
  await page.goto('/results?limit=all');
  await expect(page.getByTestId('stat-best')).toHaveText('20.000');
  await expect(page.locator('.results-title')).toContainText('5000');
  expect(await page.locator('.chart-surface svg *').count()).toBeLessThan(50);
  await select.selectOption(main);
  await expect(page.getByTestId('stat-best')).toHaveText('10.000');
  await expect(page.getByRole('combobox', { name: 'Range' })).toHaveValue(
    '100',
  );
});
for (const scale of [2, 4]) {
  test(`session controls reflow with ${scale * 100}% enlarged text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ready(page);
    await create(page, 'Long practice session');
    await page.addStyleTag({ content: `html { font-size: ${16 * scale}px; }` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Manage sessions', exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page
        .getByRole('dialog', { name: 'Manage sessions', exact: true })
        .getByRole('button', { name: 'Create session' }),
    ).toBeInViewport();
  });
}
