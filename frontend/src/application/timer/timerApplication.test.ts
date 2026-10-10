// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Solve } from '../../domain/solves';
import {
  calculateAo5,
  calculateAo12,
  calculateAo50,
  calculateAo100,
  calculateBest,
  calculateMean,
} from '../../domain/statistics';
import type { Scramble } from '../../domain/scramble';
import type { SolveRepository } from '../../infrastructure/persistence/solveRepository';
import { SolveNotFoundError } from '../../infrastructure/persistence/solveRepository';
import { TimerApplication } from './index';
import { withSessions } from '../../test/trainingRepositoryFixture';

const A: Scramble = { event: '333', notation: "R U R'" };
const B: Scramble = { event: '333', notation: 'F2 U2' };
const date = '2026-10-06T10:00:00.000Z';
const old: Solve = {
  id: 'old',
  sessionId: 'test-main-session',
  event: '333',
  scramble: 'U',
  rawTimeMs: 10000,
  penalty: 'NONE',
  note: null,
  createdAt: '2026-10-05T10:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(initial: Solve[] = []) {
  const records = new Map(initial.map((solve) => [solve.id, { ...solve }]));
  const repository = withSessions({
    getAll: vi.fn(async () =>
      [...records.values()].map((solve) => ({ ...solve })),
    ),
    getById: vi.fn(async (id: string) => records.get(id)),
    save: vi.fn(async (solve: Readonly<Solve>) => {
      if (records.has(solve.id)) throw new Error('Duplicate ID');
      records.set(solve.id, { ...solve });
    }),
    update: vi.fn(async (solve: Readonly<Solve>) => {
      if (!records.has(solve.id)) throw new SolveNotFoundError(solve.id);
      records.set(solve.id, { ...solve });
    }),
    delete: vi.fn(async (id: string) => {
      records.delete(id);
    }),
    clear: vi.fn(async () => {
      records.clear();
    }),
    close: vi.fn(),
  } satisfies SolveRepository);
  const scrambleGenerator = {
    generate333: vi
      .fn<() => Promise<Scramble>>()
      .mockResolvedValueOnce(A)
      .mockResolvedValue(B),
  };
  let nextId = 0;
  const idGenerator = { generate: vi.fn(() => `solve-${++nextId}`) };
  const dateProvider = { nowIso: vi.fn(() => date) };
  const timerClock = { now: vi.fn(() => 2000.5) };
  const app = new TimerApplication({
    solveRepository: repository,
    scrambleGenerator,
    idGenerator,
    dateProvider,
    timerClock,
  });
  return {
    app,
    repository,
    records,
    scrambleGenerator,
    idGenerator,
    dateProvider,
    timerClock,
  };
}

async function start(app: TimerApplication, origin = 0) {
  await app.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: origin });
  await app.dispatchTimerEvent({
    type: 'HOLD_THRESHOLD_REACHED',
    now: origin + 300,
    holdStartedAt: origin,
  });
  await app.dispatchTimerEvent({ type: 'START_KEY_UP', now: origin + 480.25 });
}

function stop(app: TimerApplication, duration = 12483.4, origin = 0) {
  return app.dispatchTimerEvent({
    type: 'STOP_KEY_DOWN',
    now: origin + 480.25 + duration,
  });
}

describe('initialization and observation', () => {
  it('starts uninitialized, with stable immutable snapshots and arming disabled', () => {
    const { app } = setup();
    expect(app.getState()).toBe(app.getState());
    expect(app.getState()).toMatchObject({
      history: { status: 'uninitialized' },
      canArm: false,
      timer: { status: 'idle' },
      currentScramble: null,
    });
    expect(Object.isFrozen(app.getState())).toBe(true);
  });

  it('loads and sorts history before generating a scramble, composing all statistics', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ...old,
      id: `old-${i.toString().padStart(3, '0')}`,
      rawTimeMs: 1000 + i,
    }));
    const { app, repository, scrambleGenerator } = setup([...rows].reverse());
    const load = deferred<Solve[]>();
    repository.getAll.mockReturnValueOnce(load.promise);
    const initialization = app.initialize();
    const sameInitialization = app.initialize();
    expect(sameInitialization).toBe(initialization);
    await Promise.resolve();
    expect(repository.getAll).toHaveBeenCalledTimes(1);
    expect(scrambleGenerator.generate333).not.toHaveBeenCalled();
    expect(app.getState().history.status).toBe('loading');
    load.resolve([...rows].reverse());
    await Promise.all([initialization, sameInitialization]);
    expect(app.getState().solves).toEqual(rows);
    expect(app.getState().statistics).toEqual({
      best: calculateBest(rows),
      mean: calculateMean(rows),
      ao5: calculateAo5(rows),
      ao12: calculateAo12(rows),
      ao50: calculateAo50(rows),
      ao100: calculateAo100(rows),
    });
    expect(app.getState().currentScramble).toEqual(A);
    expect(app.getState().canArm).toBe(true);
    await app.initialize();
    expect(repository.getAll).toHaveBeenCalledTimes(1);
  });

  it('supports empty history', async () => {
    const { app } = setup();
    await app.initialize();
    expect(app.getState().solves).toEqual([]);
    expect(app.getState().statistics).toMatchObject({
      best: null,
      mean: null,
      ao5: { status: 'INSUFFICIENT_DATA' },
    });
    expect(app.getState().canArm).toBe(true);
  });

  it('exposes load failure without pretending history loaded and permits retry', async () => {
    const { app, repository, scrambleGenerator } = setup([old]);
    const error = new Error('load failed');
    repository.getAll.mockRejectedValueOnce(error);
    await app.initialize();
    expect(app.getState().history).toEqual({ status: 'error', error });
    expect(app.getState().canArm).toBe(false);
    expect(scrambleGenerator.generate333).not.toHaveBeenCalled();
    await app.initialize();
    expect(app.getState().solves).toEqual([old]);
    expect(app.getState().canArm).toBe(true);
  });

  it('retains loaded history on scramble failure and retries only generation', async () => {
    const { app, repository, scrambleGenerator } = setup([old]);
    const error = new Error('scramble failed');
    scrambleGenerator.generate333
      .mockReset()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(A);
    await app.initialize();
    expect(app.getState().scramble).toEqual({ status: 'error', error });
    expect(app.getState().history.status).toBe('ready');
    expect(app.getState().solves).toEqual([old]);
    await start(app);
    expect(app.getState().timer.status).toBe('idle');
    await app.retryScramble();
    expect(app.getState().canArm).toBe(true);
    expect(repository.getAll).toHaveBeenCalledTimes(1);
  });

  it('notifies observers, preserves previous snapshots and unsubscribes', async () => {
    const { app } = setup([old]);
    const before = app.getState();
    const listener = vi.fn();
    const unsubscribe = app.subscribe(listener);
    await app.initialize();
    // History readiness and scramble startup are now independent notifications.
    expect(listener).toHaveBeenCalledTimes(4);
    expect(before.history.status).toBe('uninitialized');
    expect(before.solves).toEqual([]);
    expect(Object.isFrozen(app.getState().solves[0])).toBe(true);
    expect(Object.isFrozen(app.getState().statistics.ao5)).toBe(true);
    unsubscribe();
    await start(app);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('isolates observer exceptions from the save workflow', async () => {
    const { app, records } = setup();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      app.subscribe(() => {
        throw new Error('observer');
      });
      await app.initialize();
      await start(app);
      await stop(app);
      expect(records.size).toBe(1);
      expect(app.getState().persistence.status).toBe('idle');
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});

describe('completed solve lifecycle', () => {
  it('creates exactly the source fields, persists before insertion and next generation', async () => {
    const { app, repository, scrambleGenerator, idGenerator, dateProvider } =
      setup();
    await app.initialize();
    await start(app);
    const save = deferred<void>();
    repository.save.mockReturnValueOnce(save.promise);
    const completion = stop(app);
    const expected: Solve = {
      id: 'solve-1',
      sessionId: 'test-main-session',
      event: '333',
      scramble: A.notation,
      rawTimeMs: 12483,
      penalty: 'NONE',
      note: null,
      createdAt: date,
    };
    expect(repository.save).toHaveBeenCalledExactlyOnceWith(expected);
    expect(app.getState().timer).toMatchObject({
      status: 'stopped',
      elapsedMs: 12483.4,
    });
    expect(app.getState().persistence.status).toBe('saving');
    expect(app.getState().solves).toEqual([]);
    expect(app.getState().currentScramble).toEqual(A);
    expect(scrambleGenerator.generate333).toHaveBeenCalledTimes(1);
    save.resolve();
    await completion;
    expect(app.getState().solves).toEqual([expected]);
    expect(app.getState().statistics).toMatchObject({
      best: 12483,
      mean: 12483,
    });
    expect(app.getState().currentScramble).toEqual(B);
    expect(idGenerator.generate).toHaveBeenCalledTimes(1);
    expect(dateProvider.nowIso).toHaveBeenCalledTimes(1);
  });

  it.each([
    [12483.41, 12483],
    [12483.499, 12483],
    [12483.5, 12484],
    [12483.55, 12484],
    [0, 0],
  ])('rounds %s once to %s', async (elapsed, rounded) => {
    const { app } = setup();
    await app.initialize();
    await start(app);
    await stop(app, elapsed);
    expect(app.getState().solves[0]?.rawTimeMs).toBe(rounded);
    expect(app.getElapsedTimeMs()).toBeCloseTo(elapsed, 8);
  });

  it('uses the injected monotonic clock only for elapsed reads', async () => {
    const { app, timerClock } = setup();
    await app.initialize();
    await start(app);
    expect(app.getElapsedTimeMs()).toBe(2000.5 - 480.25);
    expect(timerClock.now).toHaveBeenCalledTimes(1);
    expect(app.getState().timer).toEqual({
      status: 'running',
      startedAt: 480.25,
    });
  });

  it('delegates early release and stale threshold behavior to the timer', async () => {
    const { app, repository } = setup();
    await app.initialize();
    await app.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
    await app.dispatchTimerEvent({ type: 'START_KEY_UP', now: 299 });
    await app.dispatchTimerEvent({
      type: 'HOLD_THRESHOLD_REACHED',
      now: 300,
      holdStartedAt: 0,
    });
    await stop(app);
    expect(app.getState().timer.status).toBe('idle');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('never regenerates an active scramble or edits history during a cycle', async () => {
    const { app, scrambleGenerator } = setup([old]);
    await app.initialize();
    await start(app);
    await app.initialize();
    await app.retryScramble();
    await expect(app.updateNote(old.id, 'x')).rejects.toThrow('busy');
    expect(scrambleGenerator.generate333).toHaveBeenCalledTimes(1);
    expect(app.getState().currentScramble).toEqual(A);
  });

  it('blocks arming before initialization and while generation is pending', async () => {
    const { app, scrambleGenerator } = setup();
    await start(app);
    expect(app.getState().timer.status).toBe('idle');
    const generation = deferred<Scramble>();
    scrambleGenerator.generate333
      .mockReset()
      .mockReturnValue(generation.promise);
    const initialization = app.initialize();
    await Promise.resolve();
    await start(app);
    expect(app.getState().timer.status).toBe('idle');
    generation.resolve(A);
    await initialization;
    expect(app.getState().canArm).toBe(true);
  });

  it('protects duplicate stops, reentrant observers and arming after release while saving', async () => {
    const { app, repository, idGenerator } = setup();
    await app.initialize();
    await start(app);
    const save = deferred<void>();
    repository.save.mockReturnValueOnce(save.promise);
    const unsubscribe = app.subscribe(() => {
      if (app.getState().timer.status === 'stopped') void stop(app);
    });
    const completion = stop(app);
    await stop(app);
    await app.retryPersistence();
    await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 14000 });
    await start(app, 15000);
    expect(app.getState().timer.status).toBe('idle');
    expect(app.getState().canArm).toBe(false);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(idGenerator.generate).toHaveBeenCalledTimes(1);
    unsubscribe();
    save.resolve();
    await completion;
    expect(app.getState().canArm).toBe(true);
  });

  it('retains a failed save for retry with the same ID, date, duration and scramble', async () => {
    const { app, repository, records, idGenerator, scrambleGenerator } =
      setup();
    const error = new Error('disk full');
    repository.save.mockRejectedValueOnce(error);
    await app.initialize();
    await start(app);
    await stop(app);
    expect(app.getState().persistence).toMatchObject({
      status: 'error',
      error,
      pending: { type: 'save', solve: { id: 'solve-1', scramble: A.notation } },
    });
    expect(records.size).toBe(0);
    expect(app.getState().solves).toEqual([]);
    expect(app.getState().statistics.best).toBeNull();
    expect(app.getState().currentScramble).toEqual(A);
    expect(scrambleGenerator.generate333).toHaveBeenCalledTimes(1);
    await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 14000 });
    await start(app, 15000);
    expect(app.getState().timer.status).toBe('idle');
    const retry = app.retryPersistence();
    await app.retryPersistence();
    await retry;
    expect(records.size).toBe(1);
    expect(repository.save.mock.calls[1]).toEqual(
      repository.save.mock.calls[0],
    );
    expect(idGenerator.generate).toHaveBeenCalledTimes(1);
    expect(app.getState().currentScramble).toEqual(B);
  });

  it('keeps a successful save and statistics when the next scramble fails', async () => {
    const { app, records, repository, scrambleGenerator } = setup();
    await app.initialize();
    const error = new Error('next scramble');
    scrambleGenerator.generate333.mockRejectedValueOnce(error);
    await start(app);
    await stop(app);
    expect(records.size).toBe(1);
    expect(app.getState().solves).toHaveLength(1);
    expect(app.getState().statistics.best).toBe(12483);
    expect(app.getState().scramble).toEqual({ status: 'error', error });
    expect(app.getState().currentScramble).toBeNull();
    await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 14000 });
    const generation = deferred<Scramble>();
    scrambleGenerator.generate333.mockReturnValueOnce(generation.promise);
    const retry = app.retryScramble();
    await app.retryScramble();
    await start(app, 15000);
    expect(app.getState().canArm).toBe(false);
    generation.resolve(B);
    await retry;
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(app.getState().canArm).toBe(true);
  });

  it('requires stop release even when persistence and next generation finish first', async () => {
    const { app } = setup();
    await app.initialize();
    await start(app);
    await stop(app);
    expect(app.getState().canArm).toBe(false);
    await start(app, 15000);
    expect(app.getState().timer.status).toBe('stopped');
    await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 16000 });
    expect(app.getState().canArm).toBe(true);
  });

  it('handles successive cycles with separate IDs and scrambles, sorting by instant then ID', async () => {
    const { app, dateProvider, records } = setup([old]);
    await app.initialize();
    await start(app);
    await stop(app);
    await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 14000 });
    dateProvider.nowIso.mockReturnValue('2026-10-04T10:00:00.000Z');
    await start(app, 15000);
    await stop(app, 2500.75, 15000);
    expect(records.get('solve-1')?.scramble).toBe(A.notation);
    expect(records.get('solve-2')?.scramble).toBe(B.notation);
    expect(app.getState().solves.map((solve) => solve.id)).toEqual([
      'solve-2',
      'old',
      'solve-1',
    ]);
    expect(app.getState().statistics.best).toBe(2501);
  });
});

describe('editing and persistence serialization', () => {
  it('updates average availability and DNF status after editing and deleting', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ...old,
      id: `row-${i}`,
      rawTimeMs: (i + 1) * 1000,
    }));
    const { app } = setup(rows);
    await app.initialize();
    expect(app.getState().statistics.ao5).toEqual({
      status: 'OK',
      timeMs: 3000,
    });
    await app.setPenalty('row-4', 'DNF');
    await app.setPenalty('row-3', 'DNF');
    expect(app.getState().statistics.ao5).toEqual({ status: 'DNF' });
    await app.deleteSolve('row-4');
    expect(app.getState().statistics.ao5).toEqual({
      status: 'INSUFFICIENT_DATA',
    });
  });

  it('applies +2, DNF and NONE using domain semantics without changing raw time', async () => {
    const { app, repository, records } = setup([old]);
    await app.initialize();
    const before = app.getState();
    for (const [penalty, best] of [
      ['PLUS_TWO', 12000],
      ['DNF', null],
      ['NONE', 10000],
    ] as const) {
      await app.setPenalty(old.id, penalty);
      expect(records.get(old.id)).toEqual({ ...old, penalty });
      expect(app.getState().statistics).toMatchObject({ best, mean: best });
      expect(app.getState().solves[0]?.rawTimeMs).toBe(old.rawTimeMs);
    }
    expect(before.solves).toEqual([old]);
    expect(repository.update).toHaveBeenCalledTimes(3);
  });

  it.each(['  note\n ', '', null])(
    'preserves note %j exactly and all unrelated fields',
    async (note) => {
      const { app, records } = setup([old]);
      await app.initialize();
      await app.updateNote(old.id, note);
      expect(records.get(old.id)).toEqual({ ...old, note });
      expect(app.getState().solves).toEqual([{ ...old, note }]);
      expect(app.getState().statistics.best).toBe(10000);
    },
  );

  it('deletes only after persistence and recalculates statistics; missing ID is a no-op', async () => {
    const { app, repository } = setup([old]);
    await app.initialize();
    const deletion = deferred<void>();
    repository.delete.mockReturnValueOnce(deletion.promise);
    const operation = app.deleteSolve(old.id);
    expect(app.getState().solves).toEqual([old]);
    deletion.resolve();
    await operation;
    expect(app.getState().solves).toEqual([]);
    expect(app.getState().statistics.best).toBeNull();
    await app.deleteSolve('missing');
    expect(repository.delete).toHaveBeenLastCalledWith('missing');
  });

  it('rejects updates of missing IDs consistently with the repository', async () => {
    const { app, repository } = setup();
    await app.initialize();
    await expect(app.setPenalty('missing', 'DNF')).rejects.toBeInstanceOf(
      SolveNotFoundError,
    );
    await expect(app.updateNote('missing', 'x')).rejects.toBeInstanceOf(
      SolveNotFoundError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each(['penalty', 'note', 'delete'] as const)(
    'preserves history after failed %s and retries the same mutation',
    async (kind) => {
      const { app, repository, records, scrambleGenerator } = setup([old]);
      await app.initialize();
      const error = new Error('write failed');
      if (kind === 'delete') repository.delete.mockRejectedValueOnce(error);
      else repository.update.mockRejectedValueOnce(error);
      if (kind === 'penalty') await app.setPenalty(old.id, 'PLUS_TWO');
      if (kind === 'note') await app.updateNote(old.id, 'memo');
      if (kind === 'delete') await app.deleteSolve(old.id);
      expect(app.getState().persistence).toMatchObject({
        status: 'error',
        error,
      });
      expect(app.getState().solves).toEqual([old]);
      expect(app.getState().statistics.best).toBe(10000);
      expect(records.get(old.id)).toEqual(old);
      await expect(app.updateNote(old.id, 'overlap')).rejects.toThrow('busy');
      await app.retryPersistence();
      expect(app.getState().persistence.status).toBe('idle');
      expect(app.getState().solves).toEqual([...records.values()]);
      expect(scrambleGenerator.generate333).toHaveBeenCalledTimes(1);
    },
  );

  it('prevents overlapping updates and arming while an edit is in flight', async () => {
    const { app, repository } = setup([old]);
    await app.initialize();
    const update = deferred<void>();
    repository.update.mockReturnValueOnce(update.promise);
    const operation = app.setPenalty(old.id, 'PLUS_TWO');
    await expect(app.updateNote(old.id, 'race')).rejects.toThrow('busy');
    await expect(app.deleteSolve(old.id)).rejects.toThrow('busy');
    await start(app);
    expect(app.getState().timer.status).toBe('idle');
    update.resolve();
    await operation;
    await app.updateNote(old.id, 'after');
    expect(repository.update).toHaveBeenLastCalledWith({
      ...old,
      penalty: 'PLUS_TWO',
      note: 'after',
    });
    expect(app.getState().canArm).toBe(true);
  });
});
