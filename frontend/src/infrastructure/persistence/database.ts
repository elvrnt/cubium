import Dexie from 'dexie';

export const SOLVE_DATABASE_NAME = 'CubeTrainerDB';

/** Internal database definition; only the repository is exposed to consumers. */
export function createDatabase(name: string = SOLVE_DATABASE_NAME): Dexie {
  const database = new Dexie(name);
  database.version(1).stores({ solves: 'id, createdAt, event' });
  return database;
}
