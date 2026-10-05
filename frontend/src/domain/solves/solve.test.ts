// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeSolve, makeSolves } from '../../test/solveFixtures';
import {
  compareSolves,
  compareSolvesChronologically,
  getEffectiveTimeMs,
  setSolvePenalty,
} from './index';
import type { SolvePenalty } from './index';

describe('getEffectiveTimeMs', () => {
  it.each([
    ['NONE', 12_483],
    ['PLUS_TWO', 14_483],
    ['DNF', null],
  ] as const)('handles %s', (penalty, expected) => {
    const solve = Object.freeze(makeSolve({ penalty }));
    expect(getEffectiveTimeMs(solve)).toBe(expected);
    expect(solve.rawTimeMs).toBe(12_483);
  });

  it('accepts a zero duration', () => {
    expect(getEffectiveTimeMs(makeSolve({ rawTimeMs: 0 }))).toBe(0);
  });
});

describe('setSolvePenalty', () => {
  const penalties: SolvePenalty[] = ['NONE', 'PLUS_TWO', 'DNF'];

  for (const previous of penalties) {
    it.each(penalties)(
      `replaces ${previous} with %s without mutation`,
      (next) => {
        const solve = Object.freeze(
          makeSolve({ penalty: previous, note: 'test' }),
        );
        const updated = setSolvePenalty(solve, next);

        expect(updated).toEqual({ ...solve, penalty: next });
        expect(updated).not.toBe(solve);
        expect(solve.penalty).toBe(previous);
        expect(updated.rawTimeMs).toBe(12_483);
      },
    );
  }

  it('does not accumulate +2 when applied repeatedly', () => {
    const once = setSolvePenalty(makeSolve(), 'PLUS_TWO');
    const twice = setSolvePenalty(once, 'PLUS_TWO');
    expect(getEffectiveTimeMs(twice)).toBe(14_483);
  });
});

describe('compareSolves', () => {
  it('orders by effective time, putting DNFs last', () => {
    const penalized = makeSolve({ rawTimeMs: 9000, penalty: 'PLUS_TWO' });
    const valid = makeSolve({ rawTimeMs: 10_000 });
    const slower = makeSolve({ rawTimeMs: 12_000 });
    const dnf = makeSolve({ rawTimeMs: 1, penalty: 'DNF' });
    expect([dnf, slower, penalized, valid].sort(compareSolves)).toEqual([
      valid,
      penalized,
      slower,
      dnf,
    ]);
  });

  it('ties equal effective times', () => {
    expect(
      compareSolves(
        makeSolve({ rawTimeMs: 9000, penalty: 'PLUS_TWO' }),
        makeSolve({ rawTimeMs: 11_000 }),
      ),
    ).toBe(0);
  });

  it('ties two DNFs regardless of raw duration', () => {
    expect(
      compareSolves(
        makeSolve({ rawTimeMs: 1000, penalty: 'DNF' }),
        makeSolve({ rawTimeMs: 20_000, penalty: 'DNF' }),
      ),
    ).toBe(0);
  });

  it('does not mutate compared solves', () => {
    const solves = makeSolves([2000, 1000]).map((solve) =>
      Object.freeze(solve),
    );
    const before = structuredClone(solves);
    [...solves].sort(compareSolves);
    expect(solves).toEqual(before);
  });
});

describe('compareSolvesChronologically', () => {
  it('ranks actual instants regardless of timestamp text order', () => {
    const older = Object.freeze(
      makeSolve({ createdAt: '2026-10-05T13:00:00+02:00' }),
    );
    const newer = Object.freeze(
      makeSolve({ createdAt: '2026-10-05T12:00:00Z' }),
    );
    expect(compareSolvesChronologically(older, newer)).toBeLessThan(0);
    expect(compareSolvesChronologically(newer, older)).toBeGreaterThan(0);
  });

  it('ranks ids by code-unit order when timestamps represent the same instant', () => {
    const lower = makeSolve({
      id: 'A',
      createdAt: '2026-10-05T15:00:00+03:00',
    });
    const higher = makeSolve({ id: 'a', createdAt: '2026-10-05T12:00:00Z' });
    expect(compareSolvesChronologically(lower, higher)).toBeLessThan(0);
    expect(compareSolvesChronologically(higher, lower)).toBeGreaterThan(0);
  });

  it('ties the same id and instant', () => {
    const solve = makeSolve();
    expect(compareSolvesChronologically(solve, { ...solve })).toBe(0);
  });
});
