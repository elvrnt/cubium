import { expect, it } from 'vitest';
import { normalizeSessionName } from './index';
it('trims edges, preserves internal spacing and checks UTF-16 length', () => {
  expect(normalizeSessionName('  Моя  сессия  ')).toBe('Моя  сессия');
  expect(normalizeSessionName('a'.repeat(80))).toHaveLength(80);
  expect(normalizeSessionName('😀'.repeat(40))).toHaveLength(80);
  for (const value of ['', '   ', 'a'.repeat(81), '😀'.repeat(41)])
    expect(() => normalizeSessionName(value)).toThrow(RangeError);
});
