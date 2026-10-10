import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
  await page.goto('/');
  await expect(page.locator('.timer-readout__status')).toHaveText(
    'Idle · Hold Space to get ready',
    { timeout: 20_000 },
  );
});

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

async function settleCube(page: Page) {
  // cubing's SVG fades in for 250ms inside a closed shadow root. Wait only
  // for screenshot settling; correctness assertions never rely on this delay.
  await expect(page.locator('twisty-player')).toBeVisible();
  await page.waitForTimeout(500);
}

async function centered(page: Page) {
  await expect
    .poll(async () =>
      page.getByRole('timer').evaluate((element) => {
        const box = element.getBoundingClientRect();
        return Math.max(
          Math.abs(box.x + box.width / 2 - innerWidth / 2),
          Math.abs(box.y + box.height / 2 - innerHeight / 2),
        );
      }),
    )
    .toBeLessThan(1);
  const geometry = await page.getByRole('timer').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      width: innerWidth,
      height: innerHeight,
      font: getComputedStyle(element).fontSize,
    };
  });
  expect(Math.abs(geometry.x - geometry.width / 2)).toBeLessThan(1);
  expect(Math.abs(geometry.y - geometry.height / 2)).toBeLessThan(1);
  return geometry.font;
}

for (const [width, height] of [
  [1440, 900],
  [1280, 720],
  [1024, 768],
] as const) {
  test(`digits keep viewport center and size through a solve at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const font = await centered(page);
    const statistics = page.getByRole('complementary', { name: 'Statistics' });
    const statsBox = await statistics.boundingBox();
    const timeBox = await page.getByRole('timer').boundingBox();
    const historyBox = await page.locator('.recent-solves').boundingBox();
    const centerBox = await page.locator('.timer-center').boundingBox();
    expect(statsBox!.x + statsBox!.width).toBeLessThan(timeBox!.x);
    expect(
      Math.abs(statsBox!.y + statsBox!.height / 2 - height / 2),
    ).toBeLessThan(1);
    expect(
      historyBox!.y - (centerBox!.y + centerBox!.height),
    ).toBeGreaterThanOrEqual(47);
    await settleCube(page);
    await page.screenshot({
      path: `../.impeccable/review/${width === 1440 ? 'desktop' : `desktop-${width}`}.png`,
      fullPage: true,
    });
    await page.getByRole('timer').click();
    await page.keyboard.down('Space');
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'holding',
    );
    await expect(page.getByTestId('scramble')).toBeVisible();
    await expect(statistics).toBeVisible();
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'ready',
    );
    expect(await centered(page)).toBe(font);
    await page.keyboard.up('Space');
    await expect(page.locator('.timer-page')).toHaveAttribute(
      'data-running',
      'true',
    );
    expect(await centered(page)).toBe(font);
    await expect(statistics).toBeHidden();
    if (width === 1440)
      await page.screenshot({ path: '../.impeccable/review/running.png' });
    await page.keyboard.down('KeyA');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(statistics).toBeVisible();
    await expect(page.getByTestId('scramble')).toBeVisible();
    expect(await centered(page)).toBe(font);
    await page.keyboard.up('KeyA');
    await expect(page.getByTestId('recent-solve')).toHaveCount(1);
    if (width === 1440) {
      await settleCube(page);
      await page.screenshot({
        path: '../.impeccable/review/stopped.png',
        fullPage: true,
      });
    }
  });
}

test('running hides all chrome, retains its DOM, keeps neutral focus and restores on keydown', async ({
  page,
}) => {
  await page
    .getByRole('combobox', { name: /Language|Язык/ })
    .evaluate((element) => element.setAttribute('data-preserved', 'yes'));
  await start(page);
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByTestId('scramble')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(
    page.getByRole('region', { name: 'Timer', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.timer-readout__status')).toContainText('Running');
  await expect(page.locator('.timer-readout__status')).toHaveClass(/sr-only/);
  await expect(page.locator('.timer-chrome').first()).toHaveAttribute(
    'inert',
    '',
  );
  await expect(page.locator('.language-selector select')).toHaveAttribute(
    'data-preserved',
    'yes',
  );
  await page.keyboard.down('Tab');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Timer', exact: true }),
  ).toBeFocused();
  await page.keyboard.down('Tab'); // browser repeat must not save a second solve
  await page.keyboard.up('Tab');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  await expect(
    page.getByRole('combobox', { name: /Language|Язык/ }),
  ).toHaveAttribute('data-preserved', 'yes');
});

for (const [width, height] of [
  [390, 844],
  [320, 800],
] as const) {
  test(`compact layout reflows and running centers at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const scramble = await page.getByTestId('scramble').boundingBox();
    const digits = await page.getByRole('timer').boundingBox();
    const cube = await page.locator('.timer-cube').boundingBox();
    const statistics = await page.locator('.timer-statistics').boundingBox();
    expect(scramble!.y + scramble!.height).toBeLessThan(digits!.y);
    expect(digits!.y + digits!.height).toBeLessThan(cube!.y);
    expect(cube!.y + cube!.height).toBeLessThan(statistics!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await settleCube(page);
    await page.screenshot({
      path: `../.impeccable/review/${width === 390 ? 'mobile' : 'mobile-320'}.png`,
      fullPage: true,
    });
    await start(page);
    await centered(page);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('recent-solve')).toHaveCount(1);
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    await page.getByRole('textbox').fill('A'.repeat(300));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const scale of [2, 4]) {
  test(`page reflows at ${scale * 100}% equivalent desktop zoom`, async ({
    page,
  }) => {
    // Desktop browser zoom divides the CSS viewport. DPR/deviceScaleFactor
    // changes raster density only and is deliberately not used as zoom.
    await page.setViewportSize({ width: 1280 / scale, height: 900 / scale });
    const scramble = await page.getByTestId('scramble').boundingBox();
    const digits = await page.getByRole('timer').boundingBox();
    expect(scramble!.y + scramble!.height).toBeLessThan(digits!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await settleCube(page);
    await page.screenshot({
      path: `../.impeccable/review/reflow-${scale * 100}.png`,
      fullPage: true,
    });
    await start(page);
    await centered(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('recent-solve')).toHaveCount(1);
  });
}

test('long results fit and the timer center survives an open note editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Advance a real solve with a fake monotonic browser clock: reload must no
  // longer promote a seeded historical solve into the central readout.
  await page.clock.install();
  await page.getByRole('timer').click();
  await page.keyboard.down('Space');
  await page.clock.runFor(350);
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await page.clock.fastForward(60_000_000);
  await page.keyboard.press('a');
  await page.getByRole('button', { name: '+2', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText(/^1000:\d{2}\.\d{3}\+$/);
  await centered(page);
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.getByRole('textbox').fill('A'.repeat(300));
  await expect(
    page.getByRole('dialog', { name: 'Note for solve' }),
  ).toBeVisible();
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .getByRole('timer')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('enlarged text switches to flowing layout before scramble and digits overlap', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 650 });
  await page.addStyleTag({
    content: `
    .scramble-notation { font-size: 50px; }
    .timer-readout__status { font-size: 28px; }
    .timer-statistics dt, .timer-statistics h2 { font-size: 24px; }
    .timer-statistics dd { font-size: 38px; }
    .brand { font-size: 40px; }
    .site-header nav a, .language-selector select { font-size: 28px; }
  `,
  });
  await expect(page.locator('.timer-page')).toHaveAttribute(
    'data-layout',
    'flow',
  );
  const scramble = await page.getByTestId('scramble').boundingBox();
  const digits = await page.getByRole('timer').boundingBox();
  expect(scramble!.y + scramble!.height).toBeLessThan(digits!.y);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await settleCube(page);
  await page.screenshot({
    path: '../.impeccable/review/enlarged-text.png',
    fullPage: true,
  });
  await start(page);
  await centered(page);
  await page.keyboard.press('KeyA');
  await expect(page.getByTestId('recent-solve')).toHaveCount(1);
});

test('concentration locks scrolling and restores the previous position on stop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 100));
  const position = await page.evaluate(() => scrollY);
  expect(position).toBeGreaterThan(0);
  // Start from neutral main without a locator click auto-scrolling the readout.
  await page
    .getByRole('main')
    .evaluate((element: HTMLElement) => element.focus({ preventScroll: true }));
  await page.keyboard.down('Space');
  await expect(page.locator('.timer-readout')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.keyboard.up('Space');
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await page.keyboard.press('KeyA');
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
  expect(await page.evaluate(() => scrollY)).toBe(position);
});
