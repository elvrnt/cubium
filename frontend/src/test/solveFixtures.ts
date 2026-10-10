import type { Solve } from '../domain/solves';

export function makeSolve(overrides: Partial<Solve> = {}): Solve {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    sessionId: 'test-main-session',
    event: '333',
    scramble: "R U R' U'",
    rawTimeMs: 12_483,
    penalty: 'NONE',
    note: null,
    createdAt: '2026-10-05T12:00:00.000Z',
    ...overrides,
  };
}

/** null denotes DNF in test data only; stored raw durations remain numeric. */
export function makeSolves(times: readonly (number | null)[]): Solve[] {
  return times.map((timeMs, index) =>
    makeSolve({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      rawTimeMs: timeMs ?? 10_000,
      penalty: timeMs === null ? 'DNF' : 'NONE',
      createdAt: new Date(Date.UTC(2026, 9, 5, 12, 0, index)).toISOString(),
    }),
  );
}
