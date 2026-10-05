import type { Solve } from '../../domain/solves';

export interface SolveRepository {
  /** Oldest to newest by instant, then id ascending for equal timestamps. */
  getAll(): Promise<Solve[]>;
  getById(id: string): Promise<Solve | undefined>;
  /** Insert a new solve; rejects if the id already exists. */
  save(solve: Readonly<Solve>): Promise<void>;
  /** Write the supplied complete snapshot; rejects if the id does not exist. */
  update(solve: Readonly<Solve>): Promise<void>;
  /** Deleting an unknown id is a successful no-op. */
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  /** Releases the connection without deleting data. This instance is then unusable. */
  close(): void;
}

export class SolveNotFoundError extends Error {
  constructor(public readonly solveId: string) {
    super(`Solve not found: ${solveId}`);
    this.name = 'SolveNotFoundError';
  }
}
