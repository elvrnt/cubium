import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(page.locator('.timer-readout__status')).toHaveText(
    'Idle · Hold Space to get ready',
    { timeout: 20000 },
  );
}
async function openEnglish(page: Page) {
  await page.goto('/');
  await page.getByRole('combobox').selectOption('en');
  await ready(page);
}

test('stops with different keyboard keys and can start the next solve', async ({
  page,
}) => {
  await openEnglish(page);
  let count = 0;
  for (const key of ['a', 'Enter', 'Escape']) {
    await ready(page);
    await page.getByRole('timer').click();
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-readout__status')).toContainText('Ready');
    await page.keyboard.up('Space');
    await expect(page.getByRole('timer')).not.toHaveText('0.000');
    await page.keyboard.press(key);
    await ready(page);
    await expect(page.getByTestId('recent-solve')).toHaveCount(++count);
  }
});
async function solve(page: Page) {
  await ready(page);
  const scramble = await page.getByTestId('scramble').innerText();
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await expect(page.getByRole('timer')).not.toHaveText('0.000');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await ready(page);
  return scramble;
}

test('Russian default, both switches and language preference survive reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Cubium — главная' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Язык' })).toHaveValue('ru');
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20000 });
  const scramble = await page.getByTestId('scramble').innerText();
  await page.getByRole('combobox').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
  await expect(page.getByTestId('scramble')).toHaveText(scramble);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue(
    'en',
  );
  await page.getByRole('combobox').selectOption('ru');
  await expect(page.getByRole('heading', { name: 'Статистика' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Язык' })).toHaveValue('ru');
});

test('cube opens larger with same scramble, closes with Escape and button, restores focus', async ({
  page,
}) => {
  await openEnglish(page);
  const opener = page.getByRole('button', { name: 'Enlarge cube' });
  const inline = await page
    .locator('.timer-cube .cube-visualization')
    .boundingBox();
  const scramble = await page.getByTestId('scramble').innerText();
  await opener.click();
  const dialog = page.getByRole('dialog', {
    name: 'Cube after current scramble',
  });
  await expect(dialog.getByRole('img')).toHaveAccessibleName(
    `3×3 cube after scramble: ${scramble}`,
  );
  const enlarged = await dialog.getByRole('img').boundingBox();
  expect(enlarged!.width).toBeGreaterThan(inline!.width * 2);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await opener.click();
  await dialog.getByRole('heading').click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('deleting displayed B keeps A but resets main readout; a new solve displays normally', async ({
  page,
}) => {
  await openEnglish(page);
  await solve(page);
  const a = await page.getByTestId('recent-solve').innerText();
  await solve(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(page.getByTestId('recent-solve')).toHaveText(a);
  await expect(page.getByRole('timer')).toHaveText('0.000');
  await expect(page.getByRole('region', { name: 'Solve actions' })).toHaveCount(
    0,
  );
  await expect(
    page.getByText('Your first solve starts with Space.'),
  ).toHaveCount(0);
  await solve(page);
  await expect(page.getByTestId('recent-solve')).toHaveCount(2);
  await expect(page.getByRole('timer')).toHaveText(
    await page.getByTestId('recent-solve').first().innerText(),
  );
});

test('historical edit stores 300 characters and penalty; old deletion preserves current result and scramble', async ({
  page,
}) => {
  await openEnglish(page);
  const historical = await solve(page);
  await solve(page);
  const result = await page.getByRole('timer').innerText();
  const current = await page.getByTestId('scramble').innerText();
  const older = page.getByTestId('recent-solve').nth(1).getByRole('button');
  await older.click();
  await expect(older).toHaveAttribute('aria-pressed', 'true');
  const dialog = page.getByRole('dialog', { name: 'Solve details' });
  await expect(dialog.getByTestId('historical-scramble')).toHaveText(
    historical,
  );
  await dialog.getByRole('button', { name: 'Note', exact: true }).click();
  const note = 'Н'.repeat(300);
  await dialog.getByRole('textbox').fill(note);
  await expect(dialog.getByText('Characters used: 300 / 300')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save note' }).click();
  await dialog.getByRole('button', { name: '+2', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: '+2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('timer')).toHaveText(result);
  await expect(page.getByTestId('scramble')).toHaveText(current);
  await page.reload();
  await ready(page);
  await older.click();
  await expect(dialog.getByTestId('historical-scramble')).toHaveText(
    historical,
  );
  await expect(
    dialog.getByRole('button', { name: '+2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(dialog.getByRole('textbox')).toHaveValue(note);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  const nextScramble = await page.getByTestId('scramble').innerText();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(page.getByRole('timer')).toHaveText(result);
  await expect(page.getByTestId('scramble')).toHaveText(nextScramble);
  await expect(
    page.locator('.recent-solves button[aria-pressed="true"]'),
  ).toHaveCount(0);
});
