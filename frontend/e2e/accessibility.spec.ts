import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
  await page.goto('/');
  await expect(page.getByTestId('scramble')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.timer-readout__status')).toContainText(
    'Hold Space',
  );
});

test('statistics help opens with Space, closes with Escape and returns to timing', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'About statistics' });
  // Follow actual Tab navigation rather than assigning focus directly.
  for (let step = 0; step < 10; step++) {
    await page.keyboard.press('Tab');
    if (await trigger.evaluate((element) => element === document.activeElement))
      break;
  }
  await expect(trigger).toBeFocused();
  await expect(page.locator('.timer-readout__status')).toContainText(
    'Click the timer',
  );
  await page.keyboard.press('Space');
  const help = page.getByRole('region', { name: 'About statistics' });
  await expect(help).toBeVisible();
  await expect(help).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(help).toHaveCount(0);
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Running');
  await expect(page.getByTestId('solve-announcement')).toBeEmpty();
  await page.keyboard.press('KeyA');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(page.getByTestId('solve-announcement')).toContainText(
    'Solve completed:',
  );
  await expect(page.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  await expect(
    page.getByRole('button', { name: 'Enlarge cube' }),
  ).toBeEnabled();
});

test('Space retains button activation, clicking the time restores hold/start and penalty changes are corrections', async ({
  page,
}) => {
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyA');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  const plus = page.getByRole('button', { name: '+2', exact: true });
  await plus.click();
  await expect(plus).toHaveAttribute('aria-pressed', 'true');
  // The pending write disables the button, which Chrome removes from focus.
  // Navigate back to it to verify actual focused-button keyboard behavior.
  for (let step = 0; step < 12; step++) {
    await page.keyboard.press('Tab');
    if (await plus.evaluate((element) => element === document.activeElement))
      break;
  }
  await expect(plus).toBeFocused();
  await expect(page.locator('.timer-readout__status')).toContainText(
    'Click the timer',
  );
  await expect(page.getByTestId('solve-announcement')).toHaveText(
    /Result updated:.*\+$/,
  );
  await page.keyboard.press('Space');
  await expect(plus).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await page.getByRole('timer').click();
  await expect(
    page.getByRole('region', { name: 'Timer', exact: true }),
  ).toBeFocused();
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Ready');
  await page.keyboard.up('Space');
  await expect(page.locator('.timer-readout__status')).toContainText('Running');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('recent-solve')).toHaveCount(2);
});

test('low-height desktop keeps history and complete keyboard guidance in view', async ({
  page,
}) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize({ ...size, height: 900 });
    const fullHeightFont = await page
      .getByRole('timer')
      .evaluate((element) => getComputedStyle(element).fontSize);
    await page.setViewportSize(size);
    const history = await page
      .getByRole('region', { name: 'Recent solves' })
      .boundingBox();
    const footer = await page.locator('.site-footer').boundingBox();
    expect(history!.y).toBeLessThan(600);
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(size.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole('timer')).toHaveCSS(
      'font-size',
      fullHeightFont,
    );
  }
});

test('mobile pointer focus hint does not shift the help button during activation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'About statistics' }).click();
  const help = page.getByRole('region', { name: 'About statistics' });
  await expect(help).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await help.getByRole('button', { name: 'Close' }).click();
  await expect(help).toHaveCount(0);
  await expect(page.getByRole('main')).toBeFocused();
});
