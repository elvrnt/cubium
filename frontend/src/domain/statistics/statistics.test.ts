// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeSolve, makeSolves } from '../../test/solveFixtures';
import { setSolvePenalty } from '../solves';
import {
  calculateAo5,
  calculateAo12,
  calculateAo100,
  calculateAverageOf,
  calculateBest,
  calculateMean,
} from './index';

describe('calculateBest', () => {
  it('finds the best result regardless of input order', () => {
    expect(calculateBest(makeSolves([12_000, 10_000, 11_000]))).toBe(10_000);
  });

  it('uses effective time for penalized solves', () => {
    expect(
      calculateBest([
        makeSolve({ rawTimeMs: 9000, penalty: 'PLUS_TWO' }),
        makeSolve({ rawTimeMs: 10_000 }),
      ]),
    ).toBe(10_000);
    expect(
      calculateBest([makeSolve({ rawTimeMs: 9000, penalty: 'PLUS_TWO' })]),
    ).toBe(11_000);
  });

  it('ignores DNFs', () => {
    expect(calculateBest(makeSolves([null, 12_000, null]))).toBe(12_000);
  });

  it('returns null for only DNFs', () => {
    expect(calculateBest(makeSolves([null, null]))).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(calculateBest([])).toBeNull();
  });

  it('retains a zero result', () => {
    expect(calculateBest(makeSolves([1000, 0]))).toBe(0);
  });
});

describe('calculateMean', () => {
  it('averages all numeric results', () => {
    expect(calculateMean(makeSolves([10_000, 11_000, 12_000]))).toBe(11_000);
  });

  it('includes +2 in the arithmetic', () => {
    expect(
      calculateMean([
        makeSolve({ rawTimeMs: 10_000, penalty: 'PLUS_TWO' }),
        makeSolve({ rawTimeMs: 10_000 }),
      ]),
    ).toBe(11_000);
  });

  it('excludes DNFs from both the total and divisor', () => {
    expect(calculateMean(makeSolves([null, 10_000, 12_000, null]))).toBe(
      11_000,
    );
  });

  it('returns null for only DNFs', () => {
    expect(calculateMean(makeSolves([null, null]))).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(calculateMean([])).toBeNull();
  });

  it('does not round fractional milliseconds', () => {
    expect(calculateMean(makeSolves([1, 2, 2]))).toBe(5 / 3);
  });

  it('counts zero as a valid time', () => {
    expect(calculateMean(makeSolves([0, 1000]))).toBe(500);
  });
});

describe('calculateAo5', () => {
  it('trims one best and one worst', () => {
    expect(
      calculateAo5(makeSolves([10_000, 11_000, 12_000, 13_000, 14_000])),
    ).toEqual({ status: 'OK', timeMs: 12_000 });
  });

  it('removes one DNF as the worst result', () => {
    expect(
      calculateAo5(makeSolves([10_000, 11_000, 12_000, 13_000, null])),
    ).toEqual({ status: 'OK', timeMs: 12_000 });
  });

  it('returns DNF if a second DNF remains after trimming', () => {
    expect(
      calculateAo5(makeSolves([10_000, 11_000, 12_000, null, null])),
    ).toEqual({ status: 'DNF' });
  });

  it('returns DNF when every solve is DNF', () => {
    expect(calculateAo5(makeSolves([null, null, null, null, null]))).toEqual({
      status: 'DNF',
    });
  });

  it('uses +2 for ranking and trims the penalized worst solve', () => {
    const solves = makeSolves([10_000, 11_000, 12_000, 13_000, 14_000]).map(
      (solve) =>
        solve.rawTimeMs === 13_000 ? setSolvePenalty(solve, 'PLUS_TWO') : solve,
    );
    expect(calculateAo5(solves)).toEqual({ status: 'OK', timeMs: 37_000 / 3 });
  });

  it('includes a retained +2 in the arithmetic', () => {
    const solves = makeSolves([8000, 9000, 10_000, 13_000, 20_000]).map(
      (solve) =>
        solve.rawTimeMs === 9000 ? setSolvePenalty(solve, 'PLUS_TWO') : solve,
    );
    expect(calculateAo5(solves)).toEqual({ status: 'OK', timeMs: 34_000 / 3 });
  });

  it('removes only one occurrence of tied extremes', () => {
    expect(
      calculateAo5(makeSolves([10_000, 10_000, 12_000, 14_000, 14_000])),
    ).toEqual({ status: 'OK', timeMs: 12_000 });
  });
});

describe('calculateAo12', () => {
  it('trims exactly one best and one worst', () => {
    const times = Array.from({ length: 12 }, (_, index) => (index + 1) ** 2);
    // Squares 2² through 11²: sum 505, ten remaining results.
    expect(calculateAo12(makeSolves(times))).toEqual({
      status: 'OK',
      timeMs: 50.5,
    });
  });

  it('uses only the latest twelve solves', () => {
    const solves = makeSolves([
      100_000,
      ...Array.from({ length: 12 }, (_, i) => (i + 1) * 1000),
    ]);
    expect(calculateAo12(solves.reverse())).toEqual({
      status: 'OK',
      timeMs: 6500,
    });
  });

  it('removes one DNF', () => {
    const times = [
      ...Array.from({ length: 11 }, (_, i) => (i + 1) * 1000),
      null,
    ];
    expect(calculateAo12(makeSolves(times))).toEqual({
      status: 'OK',
      timeMs: 6500,
    });
  });

  it('returns DNF for two DNFs', () => {
    const times = [
      ...Array.from({ length: 10 }, (_, i) => (i + 1) * 1000),
      null,
      null,
    ];
    expect(calculateAo12(makeSolves(times))).toEqual({ status: 'DNF' });
  });
});

describe('calculateAo100', () => {
  it('trims exactly five results from each end', () => {
    const times = Array.from({ length: 100 }, (_, i) => (i + 1) ** 2);
    // Squares 6² through 95²: sum 290265, ninety remaining results.
    expect(calculateAo100(makeSolves(times))).toEqual({
      status: 'OK',
      timeMs: 290_265 / 90,
    });
  });

  it('uses only the latest hundred solves', () => {
    const times = [
      1_000_000,
      ...Array.from({ length: 100 }, (_, i) => (i + 1) ** 2),
    ];
    expect(calculateAo100(makeSolves(times).reverse())).toEqual({
      status: 'OK',
      timeMs: 290_265 / 90,
    });
  });

  it('can remove five DNFs', () => {
    const times = [
      ...Array<number>(95).fill(10_000),
      ...Array<null>(5).fill(null),
    ];
    expect(calculateAo100(makeSolves(times))).toEqual({
      status: 'OK',
      timeMs: 10_000,
    });
  });

  it('returns DNF when six DNFs leave one after trimming', () => {
    const times = [
      ...Array<number>(94).fill(10_000),
      ...Array<null>(6).fill(null),
    ];
    expect(calculateAo100(makeSolves(times))).toEqual({ status: 'DNF' });
  });
});

describe('insufficient data', () => {
  it.each([
    [5, calculateAo5],
    [12, calculateAo12],
    [100, calculateAo100],
  ] as const)(
    'distinguishes insufficient data from DNF for ao%s',
    (count, calculate) => {
      expect(calculate(makeSolves(Array<null>(count - 1).fill(null)))).toEqual({
        status: 'INSUFFICIENT_DATA',
      });
      expect(calculate([])).toEqual({ status: 'INSUFFICIENT_DATA' });
      expect(calculate(makeSolves(Array<null>(count).fill(null)))).toEqual({
        status: 'DNF',
      });
    },
  );
});

describe('chronology and immutability', () => {
  it('selects the latest N from an unordered array, before ranking by result', () => {
    const solves = makeSolves([
      100_000, 1, 10_000, 11_000, 12_000, 13_000, 14_000,
    ]);
    const unordered = [...solves.slice(4), ...solves.slice(0, 4)];
    expect(calculateAo5(unordered)).toEqual({ status: 'OK', timeMs: 12_000 });
  });

  it('breaks timestamp ties by id, independently of input order', () => {
    const solves = makeSolves([
      100_000, 10_000, 11_000, 12_000, 13_000, 14_000,
    ]).map((solve) => ({ ...solve, createdAt: '2026-10-05T12:00:00.000Z' }));
    expect(calculateAo5(solves)).toEqual({ status: 'OK', timeMs: 12_000 });
    expect(calculateAo5([...solves].reverse())).toEqual({
      status: 'OK',
      timeMs: 12_000,
    });
  });

  it('compares actual instants rather than ISO strings lexicographically', () => {
    const older = makeSolve({
      id: 'older',
      rawTimeMs: 100_000,
      createdAt: '2026-10-05T13:00:00+02:00',
    });
    const latest = makeSolves([10_000, 11_000, 12_000, 13_000, 14_000]);
    expect(calculateAo5([...latest, older])).toEqual({
      status: 'OK',
      timeMs: 12_000,
    });
  });

  it('does not reorder the input array or change solve objects', () => {
    const solves = Object.freeze(
      makeSolves([14_000, 10_000, null, 11_000, 12_000, 13_000])
        .reverse()
        .map((solve) => Object.freeze(solve)),
    );
    const before = structuredClone(solves);
    calculateBest(solves);
    calculateMean(solves);
    calculateAo5(solves);
    expect(solves).toEqual(before);
  });
});

describe('calculateAverageOf', () => {
  it('supports the smallest usable count', () => {
    expect(calculateAverageOf(makeSolves([1000, 2000, 10_000]), 3)).toEqual({
      status: 'OK',
      timeMs: 2000,
    });
  });

  it('rounds the trim count up for other window sizes', () => {
    const times = Array.from({ length: 21 }, (_, i) => (i + 1) ** 2);
    // Squares 3² through 19²: sum 2465, seventeen remaining results.
    expect(calculateAverageOf(makeSolves(times), 21)).toEqual({
      status: 'OK',
      timeMs: 145,
    });
  });

  it.each([0, 1, 2, -5, 5.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid count %s even for empty input',
    (count) => expect(() => calculateAverageOf([], count)).toThrow(RangeError),
  );
});
