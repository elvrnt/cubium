// @vitest-environment node
import { expect, it } from 'vitest';
import { calculateAo50 } from './index';
import { makeSolves } from '../../test/solveFixtures';

it('requires 50 solves', () => {
  expect(calculateAo50(makeSolves(Array<number>(49).fill(10000)))).toEqual({
    status: 'INSUFFICIENT_DATA',
  });
});
it('averages exactly 50, removing three best and three worst', () => {
  const solves = makeSolves([
    1,
    2,
    3,
    ...Array<number>(44).fill(12000),
    50000,
    60000,
    70000,
  ]);
  expect(calculateAo50(solves)).toEqual({ status: 'OK', timeMs: 12000 });
});
it.each([0, 1, 2, 3, 4])('handles %i DNFs with three worst trimmed', (dnfs) => {
  const times: (number | null)[] = Array<number>(50 - dnfs).fill(10000);
  times.push(...Array<null>(dnfs).fill(null));
  expect(calculateAo50(makeSolves(times))).toEqual(
    dnfs <= 3 ? { status: 'OK', timeMs: 10000 } : { status: 'DNF' },
  );
});
it('uses +2 effective times without mutating the source', () => {
  const solves = makeSolves(Array<number>(50).fill(10000)).map((solve) =>
    Object.freeze({ ...solve, penalty: 'PLUS_TWO' as const }),
  );
  expect(calculateAo50(Object.freeze(solves))).toEqual({
    status: 'OK',
    timeMs: 12000,
  });
  expect(solves[0]!.rawTimeMs).toBe(10000);
});
it('retains exactly 44 non-uniform values after trimming', () => {
  const solves = makeSolves(Array.from({ length: 50 }, (_, i) => (i + 1) ** 2));
  expect(calculateAo50(solves)).toEqual({ status: 'OK', timeMs: 811.5 });
});
it('selects latest 50 chronologically before ranking', () => {
  const solves = makeSolves([
    ...Array<number>(10).fill(1000),
    ...Array<number>(50).fill(20000),
  ]);
  expect(calculateAo50(solves.reverse())).toEqual({
    status: 'OK',
    timeMs: 20000,
  });
});
