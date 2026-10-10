import { vi } from 'vitest';
import { TimerApplication } from '../application/timer';
import type { Solve } from '../domain/solves';
import type { Scramble } from '../domain/scramble';
import { withSessions } from './trainingRepositoryFixture';

export function timerApplicationFixture(solves: Solve[] = []) {
  const records = new Map(solves.map((solve) => [solve.id, { ...solve }]));
  const repository = withSessions({
    getAll: vi.fn(async () => [...records.values()]),
    getById: vi.fn(async (id: string) => records.get(id)),
    save: vi.fn(async (solve: Readonly<Solve>) => {
      records.set(solve.id, { ...solve });
    }),
    update: vi.fn(async (solve: Readonly<Solve>) => {
      records.set(solve.id, { ...solve });
    }),
    delete: vi.fn(async (id: string) => {
      records.delete(id);
    }),
    clear: vi.fn(async () => {
      records.clear();
    }),
    close: vi.fn(),
  });
  const generator = {
    generate333: vi
      .fn<() => Promise<Scramble>>()
      .mockResolvedValue({ event: '333', notation: 'R U2' }),
  };
  let id = 0;
  let now = 0;
  const clock = { now: vi.fn(() => now) };
  const application = new TimerApplication({
    solveRepository: repository,
    scrambleGenerator: generator,
    timerClock: clock,
    idGenerator: { generate: () => `solve-${++id}` },
    dateProvider: { nowIso: () => '2026-10-06T12:00:00.000Z' },
  });
  return {
    application,
    clock,
    repository,
    generator,
    records,
    setTime: (value: number) => {
      now = value;
    },
  };
}
