import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function startWithSpace(page: Page) {
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
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20000 });
});

for (const close of ['button', 'Escape', 'backdrop']) {
  test(`cube closed by ${close} returns Space to timer`, async ({ page }) => {
    await page.getByRole('button', { name: 'Увеличить куб' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    if (close === 'button')
      await dialog.getByRole('button', { name: 'Закрыть' }).click();
    else if (close === 'Escape') await page.keyboard.press('Escape');
    else await page.mouse.click(5, 5);
    await expect(page.getByRole('main')).toBeFocused();
    await startWithSpace(page);
    await expect(dialog).not.toBeVisible();
  });
}

test('pointer language selection returns Space to timer', async ({ page }) => {
  const language = page.getByRole('combobox');
  await language.click();
  await language.selectOption('en');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('main')).toBeFocused();
  await startWithSpace(page);
  await expect(page.locator('.language-selector select')).toHaveValue('en');
});

test('Tab navigation retains native language control and cube button activation', async ({
  page,
}) => {
  await page.keyboard.press('Tab'); // brand
  await page.keyboard.press('Tab'); // timer navigation
  await page.keyboard.press('Tab'); // language
  const language = page.getByRole('combobox');
  await expect(language).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(language).toHaveValue('en');
  await expect(language).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'idle',
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab'); // timer area
  await page.keyboard.press('Tab'); // cube
  await expect(
    page.getByRole('button', { name: 'Enlarge cube' }),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('main')).toBeFocused();
  await startWithSpace(page);
});
