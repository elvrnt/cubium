import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cubium.language', 'en'));
  await page.goto('/');
  await expect(page.locator('.timer-readout__status')).toHaveText(
    'Idle · Hold Space to get ready',
    { timeout: 20_000 },
  );
});

for (const decimals of [0, 1, 2, 3]) {
  test(`running precision ${decimals} is independent of results and survives reload`, async ({
    page,
  }) => {
    const resultDecimals = decimals % 2 === 0 ? 2 : 3;
    await page.getByRole('button', { name: 'Timer settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Timer settings' });
    const running = dialog.getByRole('combobox', { name: 'While running' });
    const results = dialog.getByRole('combobox', { name: 'Results' });
    await expect(running.locator('option')).toHaveCount(4);
    await expect(results.locator('option')).toHaveCount(2);
    await running.selectOption(String(decimals));
    await results.selectOption(String(resultDecimals));
    await running.press('Space');
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'idle',
    );
    await running.press('Escape');
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('timer')).toHaveText(
      resultDecimals === 2 ? '0.00' : '0.000',
    );
    const clockTime = new Date('2026-10-10T12:00:00Z');
    await page.clock.install({ time: clockTime });
    await page.clock.pauseAt(new Date(clockTime.getTime() + 1000));
    await page.getByRole('timer').click();
    await page.keyboard.down('Space');
    await page.clock.fastForward(300);
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'ready',
    );
    await page.keyboard.up('Space');
    await page.clock.fastForward(1234);
    await expect(page.getByRole('timer')).toHaveText(
      decimals === 0 ? /^1$/ : new RegExp(`^1\\.\\d{${decimals}}$`),
    );
    await expect(
      page.getByRole('button', { name: 'Timer settings' }),
    ).toHaveCount(0);
    await page.keyboard.down('KeyA');
    const resultText = resultDecimals === 2 ? '1.23' : '1.234';
    await expect(page.getByRole('timer')).toHaveText(resultText);
    await page.keyboard.up('KeyA');
    await expect(page.getByTestId('recent-solve')).toHaveText(resultText);
    const rawTimeMs = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('CubeTrainerDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<number>((resolve, reject) => {
          const request = database
            .transaction('solves')
            .objectStore('solves')
            .getAll();
          request.onsuccess = () => resolve(request.result[0].rawTimeMs);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    });
    expect(rawTimeMs).toBe(1234);
    await page.reload();
    await expect(page.getByTestId('recent-solve')).toHaveText(resultText);
    await page.getByRole('button', { name: 'Timer settings' }).click();
    await expect(
      page.getByRole('combobox', { name: 'While running' }),
    ).toHaveValue(String(decimals));
    await expect(page.getByRole('combobox', { name: 'Results' })).toHaveValue(
      String(resultDecimals),
    );
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    await expect(page.locator('.journal-time')).toHaveText(resultText);
    await page.getByRole('button', { name: /^Open solve/ }).click();
    await expect(
      page.getByRole('dialog', { name: 'Solve details' }),
    ).toContainText(resultText);
  });
}

for (const [width, height, language] of [
  [1440, 900, 'en'],
  [320, 800, 'ru'],
] as const) {
  test(`settings reflow and retain native keyboard focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page
      .getByRole('combobox', { name: /Language|Язык/ })
      .selectOption(language);
    const trigger = page.getByRole('button', {
      name: /Timer settings|Настройки таймера/,
    });
    await trigger.focus();
    await trigger.press('Space');
    const dialog = page.getByRole('dialog', {
      name: /Timer settings|Настройки таймера/,
    });
    await expect(dialog).toBeVisible();
    for (const factor of [1, 2, 4]) {
      await page.evaluate(
        (factor) =>
          (document.documentElement.style.fontSize = `${factor * 100}%`),
        factor,
      );
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = '100%'),
    );
    await page.screenshot({
      path: `../.impeccable/review/time-settings-${width}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(page.locator('.timer-readout')).toHaveAttribute(
      'data-state',
      'idle',
    );
  });
}
