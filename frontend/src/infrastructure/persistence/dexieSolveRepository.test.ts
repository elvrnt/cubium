// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setSolvePenalty } from '../../domain/solves';
import type { SolvePenalty } from '../../domain/solves';
import { calculateAo5 } from '../../domain/statistics';
import {
  makeSolve as makeFixtureSolve,
  makeSolves as makeFixtureSolves,
} from '../../test/solveFixtures';
import type { Solve } from '../../domain/solves';
import { createDatabase } from './database';
import { createSolveRepository, SolveNotFoundError } from './index';
import type { SolveRepository } from './index';

describe('IndexedDB solve repository', () => {
  let databaseName: string;
  let repository: SolveRepository;
  let sessionId: string;
  const makeSolve = (overrides: Partial<Solve> = {}) =>
    makeFixtureSolve({ sessionId, ...overrides });
  const makeSolves = (times: readonly (number | null)[]) =>
    makeFixtureSolves(times).map((solve) => ({ ...solve, sessionId }));

  beforeEach(async () => {
    databaseName = `CubeTrainerDB-test-${crypto.randomUUID()}`;
    const training = createSolveRepository(databaseName);
    repository = training;
    sessionId = (await training.loadSnapshot()).activeSessionId;
  });

  afterEach(async () => {
    repository.close();
    await Dexie.delete(databaseName);
  });

  it('creates version 2 stores and retains the required solve indexes', async () => {
    await repository.getAll();
    const database = createDatabase(databaseName);
    try {
      await database.open();
      expect(database.verno).toBe(2);
      expect(database.tables.map((table) => table.name).sort()).toEqual([
        'sessions',
        'settings',
        'solves',
      ]);
      const schema = database.table('solves').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.primKey.auto).toBe(false);
      expect(schema.indexes.map((index) => index.name).sort()).toEqual([
        'createdAt',
        'event',
        'sessionId',
      ]);
    } finally {
      database.close();
    }
  });

  it('returns an empty collection and undefined for an unknown id', async () => {
    expect(await repository.getAll()).toEqual([]);
    expect(await repository.getById(crypto.randomUUID())).toBeUndefined();
  });

  it('preserves every source field when saving and retrieving', async () => {
    const solve = makeSolve();
    await repository.save(solve);
    expect(await repository.getById(solve.id)).toEqual(solve);
    expect(await repository.getAll()).toEqual([solve]);
  });

  it('rejects duplicate ids without overwriting the stored solve', async () => {
    const solve = makeSolve();
    await repository.save(solve);
    await expect(
      repository.save({ ...solve, note: 'duplicate' }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    expect(await repository.getById(solve.id)).toEqual(solve);
    expect(await repository.getAll()).toHaveLength(1);
  });

  it('returns all solves oldest first regardless of insertion order', async () => {
    const solves = makeSolves([10_000, 11_000, 12_000, 13_000, 14_000]);
    for (const solve of [...solves].reverse()) await repository.save(solve);
    const reloaded = await repository.getAll();
    expect(reloaded).toEqual(solves);
    expect(calculateAo5(reloaded)).toEqual({ status: 'OK', timeMs: 12_000 });
  });

  it('uses ascending id as the deterministic fallback for equal timestamps', async () => {
    const solves = makeSolves([10_000, 11_000, 12_000]).map((solve) => ({
      ...solve,
      createdAt: '2026-10-05T12:00:00.000Z',
    }));
    for (const solve of [...solves].reverse()) await repository.save(solve);
    expect(await repository.getAll()).toEqual(solves);
    expect(await repository.getAll()).toEqual(solves);
  });

  it('orders actual instants, preserving the supplied timestamp strings', async () => {
    const older = makeSolve({ createdAt: '2026-10-05T13:00:00+02:00' });
    const newer = makeSolve({
      id: crypto.randomUUID(),
      createdAt: '2026-10-05T12:00:00Z',
    });
    await repository.save(newer);
    await repository.save(older);
    expect(await repository.getAll()).toEqual([older, newer]);
  });

  it('uses the id fallback for equivalent instants with different offsets', async () => {
    const earlierId = makeSolve({ createdAt: '2026-10-05T15:00:00+03:00' });
    const laterId = makeSolve({
      id: '00000000-0000-4000-8000-000000000001',
      createdAt: '2026-10-05T12:00:00.000Z',
    });
    await repository.save(laterId);
    await repository.save(earlierId);
    expect(await repository.getAll()).toEqual([earlierId, laterId]);
  });

  const penalties: SolvePenalty[] = ['NONE', 'PLUS_TWO', 'DNF'];
  for (const previous of penalties) {
    it.each(penalties)(
      `persists ${previous} -> %s using the domain operation`,
      async (next) => {
        const solve = makeSolve({
          penalty: previous,
          note: 'preserve this note',
        });
        await repository.save(solve);
        const updated = setSolvePenalty(solve, next);
        await repository.update(updated);
        expect(await repository.getById(solve.id)).toEqual(updated);
        expect(solve.penalty).toBe(previous);
      },
    );
  }

  it.each(['Training note: хороший результат', '', null])(
    'updates a note to %s without changing other fields',
    async (note) => {
      const solve = setSolvePenalty(
        makeSolve({ note: 'original' }),
        'PLUS_TWO',
      );
      await repository.save(solve);
      const updated = { ...solve, note };
      await repository.update(updated);
      expect(await repository.getById(solve.id)).toEqual(updated);
    },
  );

  it('rejects updating an unknown id without inserting or changing other records', async () => {
    const existing = makeSolve();
    const unknown = makeSolve({ id: crypto.randomUUID(), note: 'not saved' });
    await repository.save(existing);
    await expect(repository.update(unknown)).rejects.toBeInstanceOf(
      SolveNotFoundError,
    );
    await expect(repository.update(unknown)).rejects.toMatchObject({
      solveId: unknown.id,
    });
    expect(await repository.getById(unknown.id)).toBeUndefined();
    expect(await repository.getAll()).toEqual([existing]);
  });

  it('deletes only the requested solve', async () => {
    const removed = makeSolve();
    const retained = makeSolve({ id: crypto.randomUUID() });
    await repository.save(removed);
    await repository.save(retained);
    await repository.delete(removed.id);
    expect(await repository.getById(removed.id)).toBeUndefined();
    expect(await repository.getAll()).toEqual([retained]);
  });

  it('treats deleting an unknown id as a successful no-op', async () => {
    const solve = makeSolve();
    await repository.save(solve);
    await expect(
      repository.delete(crypto.randomUUID()),
    ).resolves.toBeUndefined();
    expect(await repository.getAll()).toEqual([solve]);
  });

  it('clears all records, remains usable, and allows clearing an empty store', async () => {
    for (const solve of makeSolves([1000, 2000, 3000]))
      await repository.save(solve);
    await repository.clear();
    expect(await repository.getAll()).toEqual([]);
    await expect(repository.clear()).resolves.toBeUndefined();
    const solve = makeSolve();
    await repository.save(solve);
    expect(await repository.getAll()).toEqual([solve]);
  });

  it('does not mutate frozen input objects when saving or updating', async () => {
    const solve = Object.freeze(makeSolve());
    const snapshot = { ...solve };
    await repository.save(solve);
    const updated = Object.freeze(setSolvePenalty(solve, 'DNF'));
    const updatedSnapshot = { ...updated };
    await repository.update(updated);
    expect(solve).toEqual(snapshot);
    expect(updated).toEqual(updatedSnapshot);
    expect(await repository.getById(solve.id)).toEqual(updatedSnapshot);
  });

  it('snapshots supplied data before asynchronous save and update operations', async () => {
    const solve = makeSolve();
    const saved = { ...solve };
    const pendingSave = repository.save(solve);
    solve.note = 'changed after save call';
    await pendingSave;
    expect(await repository.getById(solve.id)).toEqual(saved);

    const updated = setSolvePenalty(saved, 'PLUS_TWO');
    const updateSnapshot = { ...updated };
    const pendingUpdate = repository.update(updated);
    updated.note = 'changed after update call';
    await pendingUpdate;
    expect(await repository.getById(solve.id)).toEqual(updateSnapshot);
  });

  it('returns detached records that cannot modify stored data implicitly', async () => {
    const solve = makeSolve();
    await repository.save(solve);
    const loaded = await repository.getById(solve.id);
    if (!loaded) throw new Error('Expected saved solve');
    loaded.note = 'unsaved edit';
    const all = await repository.getAll();
    for (const result of all) result.note = 'another unsaved edit';
    all.length = 0;
    expect(await repository.getById(solve.id)).toEqual(solve);
  });

  it('never stores derived or extra properties on save or update', async () => {
    const solve = makeSolve();
    const withDerived = {
      ...solve,
      effectiveTimeMs: 12_483,
      best: 12_483,
      mean: 12_483,
      ao5: 12_483,
      ao12: null,
      ao100: null,
    };
    await repository.save(withDerived);
    expect(await repository.getById(solve.id)).toEqual(solve);
    const updated = setSolvePenalty(solve, 'PLUS_TWO');
    await repository.update({ ...withDerived, ...updated });
    expect(await repository.getById(solve.id)).toEqual(updated);
  });

  it('retains saved and updated records across closed repository instances', async () => {
    const solves = makeSolves([10_000, 11_000]);
    for (const solve of solves) await repository.save(solve);
    const original = solves[0];
    if (!original) throw new Error('Expected test fixture');
    const updated = { ...setSolvePenalty(original, 'DNF'), note: 'persisted' };
    await repository.update(updated);
    repository.close();

    repository = createSolveRepository(databaseName);
    expect(await repository.getById(updated.id)).toEqual(updated);
    expect(await repository.getAll()).toEqual([updated, ...solves.slice(1)]);
  });

  it('does not resurrect deleted or cleared records after reopening', async () => {
    const removed = makeSolve();
    const retained = makeSolve({ id: crypto.randomUUID() });
    await repository.save(removed);
    await repository.save(retained);
    await repository.delete(removed.id);
    repository.close();
    repository = createSolveRepository(databaseName);
    expect(await repository.getAll()).toEqual([retained]);
    await repository.clear();
    repository.close();
    repository = createSolveRepository(databaseName);
    expect(await repository.getAll()).toEqual([]);
  });

  it.each(['getAll', 'getById', 'save', 'update', 'delete', 'clear'] as const)(
    'propagates IndexedDB failure from %s after the connection is closed',
    async (method) => {
      const solve = makeSolve();
      await repository.save(solve);
      repository.close();
      const operations = {
        getAll: () => repository.getAll(),
        getById: () => repository.getById(solve.id),
        save: () => repository.save(makeSolve({ id: crypto.randomUUID() })),
        update: () => repository.update(solve),
        delete: () => repository.delete(solve.id),
        clear: () => repository.clear(),
      };
      await expect(operations[method]()).rejects.toMatchObject({
        name: 'DatabaseClosedError',
      });
      repository = createSolveRepository(databaseName);
      expect(await repository.getAll()).toEqual([solve]);
    },
  );
});
