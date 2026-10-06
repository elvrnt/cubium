// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { cryptoIdGenerator, systemDateProvider } from './index';

it('delegates IDs to crypto.randomUUID', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const randomUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);
  try {
    expect(cryptoIdGenerator.generate()).toBe(id);
  } finally {
    randomUUID.mockRestore();
  }
});

it('uses UTC wall time independently of the monotonic clock', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-10-06T13:00:00+03:00'));
    expect(systemDateProvider.nowIso()).toBe('2026-10-06T10:00:00.000Z');
  } finally {
    vi.useRealTimers();
  }
});
