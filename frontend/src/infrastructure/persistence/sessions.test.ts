// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSolveRepository } from './dexieSolveRepository';
import { createDatabase } from './database';
import type { TrainingRepository } from './trainingRepository';
import { makeSolve, makeSolves } from '../../test/solveFixtures';
import type { Session } from '../../domain/sessions';

let name: string;
let repo: TrainingRepository;
beforeEach(() => {
  name = `sessions-${crypto.randomUUID()}`;
  repo = createSolveRepository(name);
});
afterEach(async () => {
  vi.restoreAllMocks();
  repo.close();
  await Dexie.delete(name);
});
const session = (name = 'Practice'): Session => ({
  id: crypto.randomUUID(),
  name,
  event: '333',
  createdAt: '2026-10-10T00:00:00Z',
  archivedAt: null,
});
async function legacy(records = makeSolves([12000, null, 14000])) {
  const db = new Dexie(name);
  db.version(1).stores({ solves: 'id, createdAt, event' });
  const old = records.map(({ sessionId: _sessionId, ...solve }) => {
    void _sessionId;
    return solve;
  });
  await db.table('solves').bulkAdd(old);
  db.close();
  return old;
}
it.each([false, true])(
  'migrates a v1 database atomically, empty=%s, and opens repeatedly without duplication',
  async (empty) => {
    const old = await legacy(empty ? [] : undefined);
    const snapshot = await repo.loadSnapshot();
    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions[0]?.name).toBe('Основная');
    expect(
      snapshot.solves.map(({ sessionId, ...solve }) => {
        expect(sessionId).toBe(snapshot.activeSessionId);
        return solve;
      }),
    ).toEqual(old);
    repo.close();
    repo = createSolveRepository(name);
    expect(await repo.loadSnapshot()).toEqual(snapshot);
  },
);
it('seeds a fresh database with one active session and persists the selected session', async () => {
  const initial = await repo.loadSnapshot();
  const next = session('  Training  ');
  const created = await repo.mutateSession({ type: 'create', session: next });
  expect(created.sessions.find((s) => s.id === next.id)?.name).toBe('Training');
  expect(created.activeSessionId).toBe(next.id);
  repo.close();
  repo = createSolveRepository(name);
  expect((await repo.loadSnapshot()).activeSessionId).toBe(next.id);
  await repo.mutateSession({ type: 'select', id: initial.activeSessionId });
  expect((await repo.loadSnapshot()).activeSessionId).toBe(
    initial.activeSessionId,
  );
});
it('renames, archives and restores without losing solves or changing the selection on restore', async () => {
  const initial = await repo.loadSnapshot();
  const next = session();
  await repo.mutateSession({ type: 'create', session: next });
  const solve = makeSolve({ sessionId: next.id });
  await repo.save(solve);
  await repo.mutateSession({ type: 'rename', id: next.id, name: 'Renamed' });
  const archived = await repo.mutateSession({
    type: 'archive',
    id: next.id,
    archivedAt: '2026-10-10T12:00:00Z',
  });
  expect(archived.activeSessionId).toBe(initial.activeSessionId);
  expect(archived.solves).toEqual([solve]);
  await expect(
    repo.save(makeSolve({ id: crypto.randomUUID(), sessionId: next.id })),
  ).rejects.toThrow();
  await expect(
    repo.mutateSession({ type: 'select', id: next.id }),
  ).rejects.toThrow();
  const restored = await repo.mutateSession({ type: 'restore', id: next.id });
  expect(restored.activeSessionId).toBe(initial.activeSessionId);
  expect(
    restored.sessions.find((s) => s.id === next.id)?.archivedAt,
  ).toBeNull();
});
it.each(['archive', 'delete'] as const)(
  'rejects %s of the last active session',
  async (type) => {
    const before = await repo.loadSnapshot();
    await expect(
      repo.mutateSession(
        type === 'delete'
          ? { type, id: before.activeSessionId }
          : {
              type,
              id: before.activeSessionId,
              archivedAt: '2026-10-10T12:00:00Z',
            },
      ),
    ).rejects.toThrow();
    expect(await repo.loadSnapshot()).toEqual(before);
  },
);
it('deletes an active or archived session and only its solves', async () => {
  const initial = await repo.loadSnapshot();
  const first = makeSolve({ sessionId: initial.activeSessionId });
  await repo.save(first);
  const next = session();
  await repo.mutateSession({ type: 'create', session: next });
  await repo.save(makeSolve({ id: crypto.randomUUID(), sessionId: next.id }));
  const removed = await repo.mutateSession({ type: 'delete', id: next.id });
  expect(removed.solves).toEqual([first]);
  expect(removed.activeSessionId).toBe(initial.activeSessionId);
  const archived = session();
  await repo.mutateSession({ type: 'create', session: archived });
  await repo.mutateSession({
    type: 'archive',
    id: archived.id,
    archivedAt: '2026-10-10T00:00:00Z',
  });
  expect(
    (await repo.mutateSession({ type: 'delete', id: archived.id })).sessions,
  ).toHaveLength(1);
});
it('rejects orphan solves and transfers, and preserves sessionId when editing', async () => {
  const initial = await repo.loadSnapshot();
  const solve = makeSolve({ sessionId: initial.activeSessionId });
  await repo.save(solve);
  await expect(
    repo.save(makeSolve({ id: crypto.randomUUID(), sessionId: 'missing' })),
  ).rejects.toThrow();
  const next = session();
  await repo.mutateSession({ type: 'create', session: next });
  await expect(repo.update({ ...solve, sessionId: next.id })).rejects.toThrow();
  await repo.update({ ...solve, note: 'Exact note', penalty: 'PLUS_TWO' });
  expect((await repo.getById(solve.id))?.sessionId).toBe(
    initial.activeSessionId,
  );
});
it('repairs an invalid or archived saved selection', async () => {
  const initial = await repo.loadSnapshot();
  const db = createDatabase(name);
  await db.table('settings').put({ key: 'activeSessionId', value: 'missing' });
  db.close();
  expect((await repo.loadSnapshot()).activeSessionId).toBe(
    initial.activeSessionId,
  );
});
it('rolls back a failed migration without changing any v1 records', async () => {
  const old = await legacy();
  const db = createDatabase(name);
  db.table('solves').hook('updating', () => {
    throw new Error('migration failure');
  });
  await expect(db.open()).rejects.toThrow();
  db.close();
  const check = new Dexie(name);
  check.version(1).stores({ solves: 'id, createdAt, event' });
  expect(await check.table('solves').toArray()).toEqual(old);
  expect(check.verno).toBe(1);
  check.close();
  expect((await repo.loadSnapshot()).solves).toHaveLength(old.length);
});
it('rolls back all cascading deletes and active selection on a failed write, then retries', async () => {
  await repo.loadSnapshot();
  const next = session();
  await repo.mutateSession({ type: 'create', session: next });
  await repo.save(makeSolve({ sessionId: next.id }));
  const before = await repo.loadSnapshot();
  const original = IDBObjectStore.prototype.delete;
  vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (
    this: IDBObjectStore,
    key,
  ) {
    if (this.name === 'sessions') throw new Error('delete failure');
    return original.call(this, key);
  });
  await expect(
    repo.mutateSession({ type: 'delete', id: next.id }),
  ).rejects.toThrow();
  expect(await repo.loadSnapshot()).toEqual(before);
  vi.restoreAllMocks();
  expect(
    (await repo.mutateSession({ type: 'delete', id: next.id })).solves,
  ).toEqual([]);
});
it('rolls back a failed selection write', async () => {
  const initial = await repo.loadSnapshot();
  const next = session();
  await repo.mutateSession({ type: 'create', session: next });
  const before = await repo.loadSnapshot();
  const original = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value,
    key,
  ) {
    if (this.name === 'settings') throw new Error('selection failure');
    return key === undefined
      ? original.call(this, value)
      : original.call(this, value, key);
  });
  await expect(
    repo.mutateSession({ type: 'select', id: initial.activeSessionId }),
  ).rejects.toThrow();
  vi.restoreAllMocks();
  expect(await repo.loadSnapshot()).toEqual(before);
});
it('reports a blocked upgrade and can retry after the old connection closes', async () => {
  await legacy([]);
  const connection = await new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open(name, 10);
    request.onsuccess = () => resolve(request.result);
  });
  try {
    await expect(repo.loadSnapshot()).rejects.toMatchObject({
      name: 'DatabaseBlockedError',
    });
  } finally {
    connection.close();
  }
  expect((await repo.loadSnapshot()).sessions).toHaveLength(1);
});
