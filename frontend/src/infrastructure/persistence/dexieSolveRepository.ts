import { compareSolvesChronologically } from '../../domain/solves';
import type { Solve } from '../../domain/solves';
import { createDatabase, SOLVE_DATABASE_NAME } from './database';
import { SolveNotFoundError } from './solveRepository';
import type { SolveRepository } from './solveRepository';

/** Copy only source fields, excluding extra properties a caller might supply. */
function toStoredSolve(solve: Readonly<Solve>): Solve {
  return {
    id: solve.id,
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
): SolveRepository {
  const database = createDatabase(databaseName);
  const solves = database.table<Solve, string>('solves');

  return {
    async getAll() {
      // ISO strings can use different offsets: the index's lexical order alone
      // is not necessarily chronological. Reuse the domain's instant ordering.
      return (await solves.toArray()).sort(compareSolvesChronologically);
    },
    async getById(id) {
      return solves.get(id);
    },
    async save(solve) {
      await solves.add(toStoredSolve(solve));
    },
    async update(solve) {
      // Dexie update is atomic and never inserts a missing record.
      const updated = await solves.update(solve.id, toStoredSolve(solve));
      if (updated === 0) throw new SolveNotFoundError(solve.id);
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
