import type { Session } from '../../domain/sessions';
import type { Solve } from '../../domain/solves';
import type { SolveRepository } from './solveRepository';

export interface TrainingSnapshot {
  sessions: Session[];
  solves: Solve[];
  activeSessionId: string;
}
export type SessionMutation =
  | { type: 'create'; session: Session }
  | { type: 'rename'; id: string; name: string }
  | { type: 'select'; id: string }
  | { type: 'archive'; id: string; archivedAt: string }
  | { type: 'restore' | 'delete'; id: string };

export interface TrainingRepository extends SolveRepository {
  loadSnapshot(): Promise<TrainingSnapshot>;
  mutateSession(mutation: SessionMutation): Promise<TrainingSnapshot>;
}
export class DatabaseBlockedError extends Error {
  constructor() {
    super('Close another Cubium tab to finish updating the database.');
    this.name = 'DatabaseBlockedError';
  }
}
