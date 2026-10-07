import { expect, test } from '@playwright/test';

for (const [language, width, height] of [
  ['ru', 1440, 900],
  ['en', 1024, 768],
  ['ru', 390, 844],
] as const) {
  test(`local stopwatch typography renders ${language} at ${width}px with equal-width digits`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript((locale) => {
      localStorage.setItem('cubium.language', locale);
    }, language);
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(request.url());
    });
    await page.goto('/');
    await expect(page.getByRole('timer')).toHaveText('0.000');
    await expect(page.getByTestId('scramble')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
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
    await page.keyboard.press('KeyA');
    await expect(page.getByTestId('recent-solve')).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        [
          ['400', 'Golos Text'],
          ['500', 'Golos Text'],
          ['600', 'Golos Text'],
          ['400', 'Cubium Golos Numeric'],
          ['500', 'Cubium Golos Numeric'],
          ['400', 'IBM Plex Mono'],
        ].every(([weight, family]) =>
          [...document.fonts].some(
            (face) =>
              face.family.replaceAll('"', '') === family &&
              face.weight === weight &&
              face.status === 'loaded',
          ),
        ),
      ),
    ).toBe(true);
    expect(fontRequests).toHaveLength(6);
    expect(
      fontRequests.every(
        (url) => new URL(url).origin === 'http://127.0.0.1:4173',
      ),
    ).toBe(true);
    await expect(page.getByRole('timer')).toHaveCSS(
      'font-family',
      /Cubium Golos Numeric/,
    );
    await expect(page.getByRole('timer')).toHaveCSS('font-weight', '500');
    await expect(page.getByRole('timer')).toHaveCSS(
      'font-variant-numeric',
      'lining-nums tabular-nums',
    );
    await expect(page.getByTestId('scramble')).toHaveCSS(
      'font-family',
      /IBM Plex Mono/,
    );
    const measurements = await page
      .locator(
        '.timer-readout__value, .timer-statistics dd, .recent-solves li > button',
      )
      .evaluateAll((elements) =>
        elements.map((element) => {
          const original = element.textContent;
          const widths = Array.from({ length: 10 }, (_, digit) => {
            element.textContent = `${digit}${digit}.${digit}${digit}${digit}`;
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getBoundingClientRect().width;
          });
          element.textContent = original;
          return widths;
        }),
      );
    for (const widths of measurements)
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Capture only after cubing's 250ms shadow-root entrance has finished.
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `../.impeccable/review/typeset-${language}-${width}.png`,
      fullPage: true,
    });
  });
}

test('failed font requests keep fallback text and timer operation available', async ({
  page,
}) => {
  await page.route('**/fonts/*.woff2', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('timer')).toHaveText('0.000');
  await expect(page.getByTestId('scramble')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () =>
        [...document.fonts].some((face) => face.status === 'error') &&
        [...document.fonts].every((face) => face.status !== 'loaded'),
    ),
  ).toBe(true);
  const box = await page.getByRole('timer').boundingBox();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
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
  await page.keyboard.press('KeyA');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
});
