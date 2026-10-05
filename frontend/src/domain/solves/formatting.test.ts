// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeSolve } from '../../test/solveFixtures';
import { formatSolveTime, formatTimeMs } from './index';

describe('formatTimeMs', () => {
  it.each([
    [0, '0.000'],
    [1, '0.001'],
    [1005, '1.005'],
    [12_483, '12.483'],
    [59_999, '59.999'],
    [60_000, '1:00.000'],
    [63_582, '1:03.582'],
    [3_600_000, '60:00.000'],
    [12_483.49, '12.483'],
    [12_483.5, '12.484'],
    [59_999.5, '1:00.000'],
  ])('formats %s ms as %s', (timeMs, expected) => {
    expect(formatTimeMs(timeMs)).toBe(expected);
  });

  it.each([-1, NaN, Infinity, -Infinity])(
    'rejects invalid time %s',
    (timeMs) => {
      expect(() => formatTimeMs(timeMs)).toThrow(RangeError);
    },
  );
});

describe('formatSolveTime', () => {
  it.each([
    ['NONE', '12.483'],
    ['PLUS_TWO', '14.483+'],
    ['DNF', 'DNF'],
  ] as const)(
    'formats %s without changing stored data',
    (penalty, expected) => {
      const solve = Object.freeze(makeSolve({ penalty }));
      const before = { ...solve };
      expect(formatSolveTime(solve)).toBe(expected);
      expect(solve).toEqual(before);
    },
  );

  it('handles +2 crossing a minute boundary', () => {
    expect(
      formatSolveTime(makeSolve({ rawTimeMs: 59_500, penalty: 'PLUS_TWO' })),
    ).toBe('1:01.500+');
  });
});
