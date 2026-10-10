import { compareSolvesChronologically } from '../../domain/solves';
import type { Solve } from '../../domain/solves';
import { createDatabase, SOLVE_DATABASE_NAME } from './database';
import { SolveNotFoundError } from './solveRepository';
import {
  normalizeSessionName,
  orderSessions,
  type Session,
} from '../../domain/sessions';
import {
  DatabaseBlockedError,
  type TrainingRepository,
  type TrainingSnapshot,
} from './trainingRepository';

/** Copy only source fields, excluding extra properties a caller might supply. */
function toStoredSolve(solve: Readonly<Solve>): Solve {
  return {
    id: solve.id,
    sessionId: solve.sessionId,
    event: solve.event,
    scramble: solve.scramble,
    rawTimeMs: solve.rawTimeMs,
    penalty: solve.penalty,
    note: solve.note,
    createdAt: solve.createdAt,
  };
}

/** Opens real browser IndexedDB lazily on the first operation. */
export function createSolveRepository(
  databaseName: string = SOLVE_DATABASE_NAME,
): TrainingRepository {
  const database = createDatabase(databaseName);
  const solves = database.table<Solve, string>('solves');
  const sessions = database.table<Session, string>('sessions');
  const settings = database.table<{ key: string; value: string }, string>(
    'settings',
  );
  const snapshot = async (): Promise<TrainingSnapshot> => {
    const list = orderSessions(await sessions.toArray());
    const saved = (await settings.get('activeSessionId'))?.value;
    const active =
      list.find((s) => s.id === saved && s.archivedAt === null) ??
      list.find((s) => s.archivedAt === null);
    if (!active) throw new Error('No active session');
    if (saved !== active.id)
      await settings.put({ key: 'activeSessionId', value: active.id });
    return {
      sessions: list,
      solves: (await solves.toArray()).sort(compareSolvesChronologically),
      activeSessionId: active.id,
    };
  };
  const requireActive = async (id: string) => {
    const session = await sessions.get(id);
    if (!session || session.archivedAt !== null)
      throw new Error('Session is missing or archived');
  };

  return {
    async loadSnapshot() {
      let blocked!: () => void;
      const failure = new Promise<never>((_, reject) => {
        blocked = () => reject(new DatabaseBlockedError());
      });
      database.on('blocked', blocked);
      try {
        return await Promise.race([
          database.transaction('rw', sessions, settings, solves, snapshot),
          failure,
        ]);
      } finally {
        database.on('blocked').unsubscribe(blocked);
      }
    },
    async mutateSession(mutation) {
      return database.transaction(
        'rw',
        sessions,
        settings,
        solves,
        async () => {
          if (mutation.type === 'create') {
            await sessions.add({
              ...mutation.session,
              name: normalizeSessionName(mutation.session.name),
            });
            await settings.put({
              key: 'activeSessionId',
              value: mutation.session.id,
            });
          } else {
            const session = await sessions.get(mutation.id);
            if (!session) throw new Error('Session not found');
            switch (mutation.type) {
              case 'rename':
                await sessions.update(session.id, {
                  name: normalizeSessionName(mutation.name),
                });
                break;
              case 'select':
                await requireActive(session.id);
                await settings.put({
                  key: 'activeSessionId',
                  value: session.id,
                });
                break;
              case 'restore':
                await sessions.update(session.id, { archivedAt: null });
                break;
              case 'archive':
              case 'delete': {
                const remaining = orderSessions(
                  await sessions.toArray(),
                ).filter((s) => s.id !== session.id && s.archivedAt === null);
                if (session.archivedAt === null && remaining.length === 0)
                  throw new Error('Keep at least one active session');
                if (
                  (await settings.get('activeSessionId'))?.value === session.id
                ) {
                  const fallback = remaining[0];
                  if (!fallback)
                    throw new Error('Keep at least one active session');
                  await settings.put({
                    key: 'activeSessionId',
                    value: fallback.id,
                  });
                }
                if (mutation.type === 'archive')
                  await sessions.update(session.id, {
                    archivedAt: mutation.archivedAt,
                  });
                else {
                  await solves.where('sessionId').equals(session.id).delete();
                  await sessions.delete(session.id);
                }
                break;
              }
            }
          }
          return snapshot();
        },
      );
    },
    async getAll() {
      // ISO strings can use different offsets: the index's lexical order alone
      // is not necessarily chronological. Reuse the domain's instant ordering.
      return (await solves.toArray()).sort(compareSolvesChronologically);
    },
    async getById(id) {
      return solves.get(id);
    },
    async save(solve) {
      const stored = toStoredSolve(solve);
      await database.transaction('rw', sessions, solves, async () => {
        await requireActive(stored.sessionId);
        await solves.add(stored);
      });
    },
    async update(solve) {
      const stored = toStoredSolve(solve);
      // Dexie update is atomic and never inserts a missing record.
      await database.transaction('rw', sessions, solves, async () => {
        await requireActive(stored.sessionId);
        const old = await solves.get(stored.id);
        if (!old) throw new SolveNotFoundError(stored.id);
        if (old.sessionId !== stored.sessionId)
          throw new Error('Solve transfer is not supported');
        await solves.update(stored.id, stored);
      });
    },
    async delete(id) {
      await solves.delete(id);
    },
    async clear() {
      await solves.clear();
    },
    close() {
      database.close();
    },
  };
}
