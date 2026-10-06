import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.timer-readout__status')).toHaveText(
    'Idle · Hold Space to get ready',
  );
}

async function solve(page: Page) {
  await ready(page);
  const activeScramble = await page.getByTestId('scramble').innerText();
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Holding');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Running');
  await expect(page.getByTestId('scramble')).toHaveText(activeScramble);
  await expect(page.getByRole('timer')).not.toHaveText('0.000');
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Stopped');
  await page.keyboard.up('Space');
  await expect(page.getByTestId('recent-solve').first()).toBeVisible();
  await ready(page);
  await expect(page.getByRole('img')).toHaveAccessibleName(
    `3×3 cube after scramble: ${await page.getByTestId('scramble').innerText()}`,
  );
}

test('desktop and laptop layouts fit with a result and an open note editor', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await solve(page);
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(page.locator('twisty-player')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`timer-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.getByRole('textbox').fill('Clean cross. Work on the first pair.');
  await page.screenshot({
    path: testInfo.outputPath('timer-note.png'),
    fullPage: true,
  });
});

test('loads the real timer with scramble, cube, zero, and no errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await ready(page);
  await expect(page).toHaveTitle('CubeTrainer');
  await expect(page.getByRole('heading', { name: '3×3 Timer' })).toBeAttached();
  await expect(page.getByRole('timer')).toHaveText('0.000');
  await expect(page.getByRole('img')).toHaveAccessibleName(
    `3×3 cube after scramble: ${await page.getByTestId('scramble').innerText()}`,
  );
  await expect(page.locator('twisty-player')).toBeVisible();
  await expect(page.getByTestId('stat-best')).toHaveText('—');
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('completes two keyboard solves, updates statistics, retains history after reload and does not scroll', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await solve(page);
  const first = await page.getByTestId('recent-solve').innerText();
  expect(Number(first)).toBeGreaterThan(0);
  expect(Number(first)).toBeLessThan(20);
  await expect(page.getByTestId('stat-best')).toHaveText(first);
  await expect(page.getByTestId('stat-mean')).toHaveText(first);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await solve(page);
  await expect(page.getByTestId('recent-solve')).toHaveCount(2);
  const results = await page.getByTestId('recent-solve').allTextContents();
  await page.reload();
  await ready(page);
  expect(await page.getByTestId('recent-solve').allTextContents()).toEqual(
    results,
  );
  expect(errors).toEqual([]);
});

test('applies and removes +2 and persists it after reload', async ({
  page,
}) => {
  await page.goto('/');
  await solve(page);
  const plus = page.getByRole('button', { name: '+2', exact: true });
  await plus.click();
  await expect(page.getByTestId('recent-solve')).toHaveText(/\+$/);
  const penalized = await page.getByTestId('recent-solve').innerText();
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('recent-solve')).toHaveText(penalized);
  await plus.click();
  await expect(page.getByTestId('recent-solve')).not.toHaveText(/\+$/);
});

test('DNF replaces +2, survives reload and toggles off', async ({ page }) => {
  await page.goto('/');
  await solve(page);
  await page.getByRole('button', { name: '+2', exact: true }).click();
  await expect(page.getByTestId('recent-solve')).toHaveText(/\+$/);
  await page.getByRole('button', { name: 'DNF', exact: true }).click();
  await expect(page.getByTestId('recent-solve')).toHaveText('DNF');
  await expect(page.getByTestId('stat-best')).toHaveText('—');
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('recent-solve')).toHaveText('DNF');
  await page.getByRole('button', { name: 'DNF', exact: true }).click();
  await expect(page.getByTestId('recent-solve')).not.toHaveText('DNF');
});

test('edits notes with spaces without timing, supports cancel, and persists after reload', async ({
  page,
}) => {
  await page.goto('/');
  await solve(page);
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  const note = page.getByRole('textbox', { name: 'Note for latest solve' });
  await note.fill('Cross');
  await page.keyboard.press('Space');
  await note.pressSequentially('then pairs');
  await expect(note).toHaveValue('Cross then pairs');
  await expect(page.locator('.timer-readout__status')).toContainText('Idle');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(note).not.toBeVisible();
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(note).toHaveValue('Cross then pairs');
  await note.fill('discard');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(note).toHaveValue('Cross then pairs');
});

test('confirms deletion and keeps the solve deleted after reload', async ({
  page,
}) => {
  await page.goto('/');
  await solve(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
  await expect(page.getByTestId('stat-best')).toHaveText('—');
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
});

test('early release and auto-repeat cannot create duplicate solves', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Idle');
  await expect(page.getByTestId('recent-solve')).toHaveCount(0);
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
});
