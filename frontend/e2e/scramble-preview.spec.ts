import { expect, test } from '@playwright/test';

test('generates scrambles in the production worker and displays their notation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/cube-preview.html');

  const notation = page.locator('.scramble-preview__notation');
  const generate = page.getByRole('button', { name: 'Generate next scramble' });
  for (let cycle = 0; cycle < 2; cycle++) {
    await expect(notation).toBeVisible({ timeout: 20_000 });
    const text = await notation.innerText();
    expect(text.trim()).not.toBe('');
    await expect(page.getByRole('img')).toHaveAccessibleName(
      `3×3 cube after scramble: ${text}`,
    );
    await expect(page.locator('twisty-player')).toHaveCount(1);
    await expect(generate).toBeEnabled();
    if (cycle === 0) await generate.click();
  }
  expect(errors).toEqual([]);
});
