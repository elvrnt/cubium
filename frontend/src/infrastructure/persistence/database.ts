import Dexie, { type Transaction } from 'dexie';

export const SOLVE_DATABASE_NAME = 'CubeTrainerDB';

async function seedSession(transaction: Transaction, migrate: boolean) {
  const id = crypto.randomUUID();
  await transaction.table('sessions').add({
    id,
    name: 'Основная',
    event: '333',
    createdAt: new Date().toISOString(),
    archivedAt: null,
  });
  if (migrate)
    await transaction.table('solves').toCollection().modify({ sessionId: id });
  await transaction
    .table('settings')
    .put({ key: 'activeSessionId', value: id });
}

/** Internal database definition; only the repository is exposed to consumers. */
export function createDatabase(name: string = SOLVE_DATABASE_NAME): Dexie {
  const database = new Dexie(name);
  database.version(1).stores({ solves: 'id, createdAt, event' });
  database
    .version(2)
    .stores({
      solves: 'id, createdAt, event, sessionId',
      sessions: 'id, createdAt',
      settings: 'key',
    })
    .upgrade((transaction) => seedSession(transaction, true));
  database.on('populate', (transaction) => seedSession(transaction, false));
  return database;
}
