// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { performanceClock } from './index';

afterEach(() => vi.restoreAllMocks());

it('delegates each reading to performance.now without rounding or caching', () => {
  const now = vi
    .spyOn(performance, 'now')
    .mockReturnValueOnce(1480.25)
    .mockReturnValueOnce(13963.8);
  expect(performanceClock.now()).toBe(1480.25);
  expect(performanceClock.now()).toBe(13963.8);
  expect(now).toHaveBeenCalledTimes(2);
});
