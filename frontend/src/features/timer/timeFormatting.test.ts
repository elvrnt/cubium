import { expect, it } from 'vitest';
import { formatDisplaySolveTime, formatDisplayTimeMs } from './timeFormatting';
import { makeSolve } from '../../test/solveFixtures';

it.each([
  [12345.8, 0, '12'],
  [12345.8, 1, '12.3'],
  [12345.8, 2, '12.34'],
  [12345.8, 3, '12.346'],
  [59999.9, 0, '59'],
  [59999.9, 1, '59.9'],
  [59999.9, 2, '59.99'],
  [60000, 2, '1:00.00'],
  [63582.8, 1, '1:03.5'],
  [63582.8, 3, '1:03.583'],
  [0, 2, '0.00'],
  [0, 3, '0.000'],
] as const)(
  'formats %s ms with %s decimals as %s',
  (time, decimals, expected) => {
    expect(formatDisplayTimeMs(time, decimals)).toBe(expected);
  },
);

it('retains raw time and penalties when changing displayed result precision', () => {
  const solve = Object.freeze(
    makeSolve({ rawTimeMs: 12345, penalty: 'PLUS_TWO' }),
  );
  expect(formatDisplaySolveTime(solve, 2)).toBe('14.34+');
  expect(formatDisplaySolveTime(solve, 3)).toBe('14.345+');
  expect(formatDisplaySolveTime({ ...solve, penalty: 'DNF' }, 2)).toBe('DNF');
  expect(solve.rawTimeMs).toBe(12345);
});

it.each([-1, Infinity, NaN])('rejects an invalid duration %s', (time) => {
  expect(() => formatDisplayTimeMs(time, 2)).toThrow(RangeError);
});
