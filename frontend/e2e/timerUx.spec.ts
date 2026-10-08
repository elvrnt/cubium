import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function idle(page: Page) {
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'idle',
  );
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20000 });
}
async function hold(page: Page) {
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'holding',
  );
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'running',
  );
}
async function solve(page: Page) {
  await idle(page);
  await page.getByRole('timer').click();
  await hold(page);
  await page.keyboard.press('a');
  await idle(page);
  await expect(
    page.getByRole('button', { name: 'Note', exact: true }),
  ).toBeEnabled();
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
  await page.goto('/');
  await idle(page);
});

test('history pointer close permits immediate Space; keyboard opener keeps native activation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await solve(page);
  await solve(page);
  const old = page.getByTestId('recent-solve').nth(1).getByRole('button');
  await old.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(page.getByRole('main')).toBeFocused();
  await hold(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('a');
  await idle(page);
  // Reach history through normal Tab navigation, rather than a pointer click.
  await page.getByRole('timer').click();
  for (
    let i = 0;
    i < 15 && !(await old.evaluate((node) => node === document.activeElement));
    i++
  )
    await page.keyboard.press('Tab');
  await expect(old).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('dialog', { name: 'Solve details' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(old).toBeFocused();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('dialog', { name: 'Solve details' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('note modal traps focus, saves spaces and closes via Cancel/Escape back to timing', async ({
  page,
}) => {
  await solve(page);
  for (const action of ['save', 'cancel', 'escape']) {
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Note for solve' });
    const input = dialog.getByRole('textbox');
    await expect(input).toBeFocused();
    if (action !== 'save') await expect(input).toHaveValue('Cross then pairs');
    await input.fill('Cross');
    await page.keyboard.press('Space');
    await input.pressSequentially('then pairs');
    await expect(input).toHaveValue('Cross then pairs');
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'idle',
    );
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      expect(
        await dialog.evaluate((node) => node.contains(document.activeElement)),
      ).toBe(true);
    }
    if (action === 'escape') await page.keyboard.press('Escape');
    else
      await dialog
        .getByRole('button', {
          name: action === 'save' ? 'Save note' : 'Cancel',
        })
        .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('main')).toBeFocused();
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'holding',
    );
    await page.keyboard.up('Space');
  }
});

test('delete confirmation Cancel/Escape preserve result; Delete resets current and returns to timing', async ({
  page,
}) => {
  await solve(page);
  await solve(page);
  const result = await page.getByRole('timer').innerText();
  for (const action of ['cancel', 'escape', 'delete']) {
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await expect(dialog).toContainText(result);
    if (action === 'escape') await page.keyboard.press('Escape');
    else
      await dialog
        .getByRole('button', {
          name: action === 'delete' ? 'Confirm delete' : 'Cancel',
        })
        .click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('timer')).toHaveText(
      action === 'delete' ? '0.000' : result,
    );
  }
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await hold(page);
});

test('historical details use local RU/EN time and deleting old result preserves current result', async ({
  page,
}) => {
  await solve(page);
  await solve(page);
  const current = await page.getByRole('timer').innerText();
  for (const language of ['en', 'ru']) {
    await page.getByRole('combobox').selectOption(language);
    await page.getByTestId('recent-solve').nth(1).getByRole('button').click();
    const dialog = page.getByRole('dialog');
    const timestamp = await dialog.locator('time').getAttribute('datetime');
    const expected = await page.evaluate(
      ({ language, timestamp }) =>
        new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(timestamp!)),
      { language, timestamp },
    );
    await expect(dialog.locator('time')).toHaveText(expected);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('combobox').selectOption('en');
  await page.getByTestId('recent-solve').nth(1).getByRole('button').click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveText(current);
  await expect(page.getByRole('main')).toBeFocused();
});
