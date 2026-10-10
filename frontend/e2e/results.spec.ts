import { expect, test, type Page } from '@playwright/test';
import { makeSolve, makeSolves } from '../src/test/solveFixtures';
import type { Solve } from '../src/domain/solves';

async function seed(page: Page, solves: Solve[]) {
  await page.goto('/results');
  await expect(page.getByRole('link', { name: 'Go to Timer' })).toBeVisible();
  await page.evaluate(async (records) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('CubeTrainerDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['solves', 'settings'], 'readwrite');
      const store = tx.objectStore('solves');
      store.clear();
      const active = tx.objectStore('settings').get('activeSessionId');
      active.onsuccess = () =>
        records.forEach((record) =>
          store.put({
            ...record,
            sessionId: (active.result as { value: string }).value,
          }),
        );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, solves);
  await page.reload();
  if (solves.length) await expect(page.locator('.chart-surface')).toBeVisible();
}
async function readyTimer(page: Page) {
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'idle',
  );
}
async function start(page: Page) {
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-page')).toHaveAttribute(
    'data-running',
    'true',
  );
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
});

test('direct route, URL filters, reload and Back/Forward retain the selected range', async ({
  page,
}) => {
  await seed(page, makeSolves(Array(120).fill(10000)));
  await expect(page.locator('.results-title')).toHaveText(/Showing 100 of 120/);
  await expect(page.getByTestId('journal-solve')).toHaveCount(50);
  await page.getByRole('combobox', { name: 'Range' }).selectOption('all');
  await expect(page).toHaveURL(/limit=all/);
  await expect(page.locator('.results-title')).toHaveText(/120 of 120/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Range' })).toHaveValue(
    'all',
  );
  await page.goBack();
  await expect(page.locator('.results-title')).toHaveText(/100 of 120/);
  await page.goForward();
  await expect(page.locator('.results-title')).toHaveText(/120 of 120/);
  await page.getByLabel('From', { exact: true }).fill('2026-10-06');
  await page.getByLabel('To', { exact: true }).fill('2026-10-05');
  await expect(page.getByRole('alert')).toHaveText(/Choose valid dates/);
  await page.getByRole('button', { name: 'Reset' }).first().click();
  await expect(page.locator('.chart-surface')).toBeVisible();
});

test('chart keyboard, native Space, pointer/touch details and series controls work', async ({
  page,
}) => {
  await seed(
    page,
    makeSolves([
      10000,
      11000,
      null,
      13000,
      14000,
      15000,
      16000,
      17000,
      18000,
      19000,
      20000,
      21000,
    ]),
  );
  const chart = page.getByRole('region', { name: 'Solve chart', exact: true });
  await chart.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.chart-inspector')).toHaveText(/10\.000/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.chart-inspector')).toHaveText(/11\.000/);
  await page.keyboard.press('Enter');
  const details = page.getByRole('dialog', {
    name: 'Solve details',
    exact: true,
  });
  await expect(details).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(chart).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveCount(0);
  const ao12 = page.getByRole('checkbox', { name: 'ao12', exact: true });
  await ao12.click();
  await expect(ao12).toBeChecked();
  await expect(page.getByTestId('chart-ao12')).toHaveAttribute('d', /M/);
  await expect(page.getByTestId('chart-ao12')).toHaveCSS(
    'visibility',
    'visible',
  );
  await chart.click({ position: { x: 150, y: 100 } });
  await expect(details).toBeVisible();
  await details.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByTestId('chart-dnf')).not.toHaveAttribute('d', '');
});

test('notes, penalties, deletion and language share durable state with Timer', async ({
  page,
}) => {
  await seed(page, makeSolves([10000, 11000]));
  await page.getByRole('button', { name: /Open solve 1:/ }).click();
  const details = page.getByRole('dialog', {
    name: 'Solve details',
    exact: true,
  });
  await details.getByRole('button', { name: '+2', exact: true }).click();
  await expect(
    details.getByRole('button', { name: '+2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await details.getByRole('button', { name: 'Note', exact: true }).click();
  const note = page.getByRole('dialog', {
    name: 'Note for solve',
    exact: true,
  });
  await note.getByRole('textbox').fill('  Cross then pairs\n');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note).toHaveCount(0);
  await details.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('link', { name: 'Timer', exact: true }).click();
  await readyTimer(page);
  const scramble = await page.getByTestId('scramble').textContent();
  await expect(page.getByTestId('stat-best')).toHaveText('11.000');
  await page.getByRole('link', { name: 'Results', exact: true }).click();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('ru');
  await expect(
    page.getByRole('heading', { name: 'Результаты', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Язык' }).selectOption('en');
  await page.getByRole('button', { name: /Open solve 1:/ }).click();
  await expect(details).toContainText('Cross then pairs');
  await details.getByRole('button', { name: 'DNF', exact: true }).click();
  await expect(
    details.getByRole('button', { name: 'DNF', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await details.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm delete', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('journal-solve')).toHaveCount(1);
  await page.getByRole('link', { name: 'Timer', exact: true }).click();
  await readyTimer(page);
  await expect(page.getByTestId('scramble')).toHaveText(scramble!);
  await page.getByRole('button', { name: 'Enlarge cube' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await start(page);
  await page.keyboard.press('a');
  await readyTimer(page);
  await start(page);
  await page.keyboard.press('a');
  await readyTimer(page);
  await expect(page.getByTestId('recent-solve')).toHaveCount(3);
});

test('deleting the last row on a journal page clamps pagination and keeps focus usable', async ({
  page,
}) => {
  await seed(page, makeSolves(Array(51).fill(10000)));
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('journal-solve')).toHaveCount(1);
  await page.getByRole('button', { name: /Open solve 1:/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm delete', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('journal-solve')).toHaveCount(50);
  await expect(
    page.getByRole('navigation', { name: 'Journal pages' }),
  ).toContainText('1 / 1');
  await expect(page.getByRole('main')).toBeFocused();
});

test('failed note writes retain the draft and Retry updates chart and history only after saving', async ({
  page,
}) => {
  await seed(page, makeSolves([10000]));
  await page.getByRole('button', { name: /Open solve 1:/ }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  const editor = page.getByRole('dialog', {
    name: 'Note for solve',
    exact: true,
  });
  await editor.getByRole('textbox').fill('Draft preserved after quota failure');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    let failOnce = true;
    IDBObjectStore.prototype.put = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'solves' && failOnce) {
        failOnce = false;
        throw new DOMException('Test quota failure', 'QuotaExceededError');
      }
      return key === undefined
        ? put.call(this, value)
        : put.call(this, value, key);
    };
  });
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    editor.getByRole('button', { name: 'Retry save', exact: true }),
  ).toBeVisible();
  await expect(editor.getByRole('textbox')).toHaveValue(
    'Draft preserved after quota failure',
  );
  await expect(page.getByTestId('journal-solve')).not.toContainText(
    'Draft preserved',
  );
  await editor.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(
    editor.getByRole('button', { name: 'Save note', exact: true }),
  ).toBeEnabled();
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Solve details', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(page.getByTestId('journal-solve')).toContainText(
    'Draft preserved after quota failure',
  );
  await page.reload();
  await expect(page.getByTestId('journal-solve')).toContainText(
    'Draft preserved after quota failure',
  );
});

test('browser Back cannot abandon a running solve; stop restores navigation', async ({
  page,
}) => {
  await seed(page, makeSolves([10000]));
  await page.getByRole('link', { name: 'Timer', exact: true }).click();
  await readyTimer(page);
  await start(page);
  await page.evaluate(() => history.back());
  // Wait for the browser's asynchronous popstate / compensating history.go.
  await page.waitForTimeout(150);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.timer-page')).toHaveAttribute(
    'data-running',
    'true',
  );
  await page.keyboard.down('a');
  await expect(
    page.getByRole('link', { name: 'Results', exact: true }),
  ).toBeVisible();
  await page.keyboard.up('a');
  await readyTimer(page);
  await page.getByRole('link', { name: 'Results', exact: true }).click();
  await expect(page.getByTestId('journal-solve')).toHaveCount(2);
});

for (const [width, height, language] of [
  [1440, 900, 'ru'],
  [1024, 768, 'en'],
  [390, 844, 'ru'],
  [320, 800, 'en'],
] as const) {
  test(`Results reflows at ${width}×${height} in ${language}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await seed(page, [
      makeSolve({
        id: 'long-result',
        rawTimeMs: 359999999,
        note: 'Длинная заметка Long note '.repeat(10),
      }),
      ...makeSolves(
        Array.from({ length: 23 }, (_, i) =>
          i % 7 === 0 ? null : 12000 + i * 300,
        ),
      ),
    ]);
    await page
      .getByRole('combobox', { name: 'Language' })
      .selectOption(language);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const overlaps = await page.locator('.results-filters').evaluate((node) => {
      const rects = Array.from(node.children).map((child) =>
        child.getBoundingClientRect(),
      );
      return rects.some((a, i) =>
        rects
          .slice(i + 1)
          .some(
            (b) =>
              Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
              Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1,
          ),
      );
    });
    expect(overlaps).toBe(false);
    await page.screenshot({
      path: `../.impeccable/review/results-${width}.png`,
      fullPage: true,
    });
  });
}

for (const scale of [2, 4]) {
  test(`Results supports ${scale * 100}% equivalent zoom and enlarged text`, async ({
    page,
  }) => {
    // Browser zoom changes the CSS viewport. Test equivalent reflow separately
    // from increasing root text size; deviceScaleFactor is only raster density.
    await page.setViewportSize({ width: 1440 / scale, height: 900 / scale });
    await seed(page, makeSolves(Array(14).fill(1234567)));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.evaluate((value) => {
      document.documentElement.style.fontSize = `${value * 100}%`;
    }, scale);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.locator('.chart-surface svg text').evaluateAll((labels) => {
          const boxes = labels
            .map((label) => label.getBoundingClientRect())
            .filter((box) => box.width > 0);
          return boxes.some((a, i) =>
            boxes
              .slice(i + 1)
              .some(
                (b) =>
                  Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 &&
                  Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1,
              ),
          );
        }),
      )
      .toBe(false);
    await page.screenshot({
      path: `../.impeccable/review/results-text-${scale}.png`,
      fullPage: true,
    });
  });
}

test('10,000 solves keep the graph DOM bounded and every result reachable', async ({
  page,
}) => {
  await seed(
    page,
    makeSolves(Array.from({ length: 10000 }, (_, i) => 10000 + i)),
  );
  await page.getByRole('combobox', { name: 'Range' }).selectOption('all');
  await expect(page.locator('.results-title')).toHaveText(/10000 of 10000/);
  await expect(page.getByTestId('journal-solve')).toHaveCount(50);
  expect(await page.locator('.chart-surface svg *').count()).toBeLessThan(50);
  await page.locator('.chart-surface').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.chart-inspector > span').first()).toHaveText(
    'Solve number 1',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('10.000');
});

test('touch opens exact solve details with selected-range averages', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() =>
      localStorage.setItem('cubium.language', 'en'),
    );
    await seed(page, makeSolves(Array(12).fill(12000)));
    await page.locator('.chart-surface').tap({ position: { x: 340, y: 100 } });
    const details = page.getByRole('dialog', {
      name: 'Solve details',
      exact: true,
    });
    await expect(details).toBeVisible();
    await expect(details.locator('.solve-detail-averages')).toHaveText(
      /ao512\.000ao1212\.000/,
    );
    await details.getByRole('button', { name: 'Close', exact: true }).tap();
    await expect(page.getByRole('main')).toBeFocused();
  } finally {
    await context.close();
  }
});
