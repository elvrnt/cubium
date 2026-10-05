import { expect, test } from '@playwright/test';

test('loads the built frontend without a backend', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('CubeTrainer');
  await expect(
    page.getByRole('heading', { name: 'CubeTrainer', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/The project foundation is ready/)).toBeVisible();
  expect(errors).toEqual([]);
});
