import type { Scramble, ScrambleGenerator } from '../../domain/scramble';
import type { Solve } from '../../domain/solves';
import type { AverageResult } from '../../domain/statistics';
import type { TimerClock, TimerState } from '../../domain/timer';
import type { SolveRepository } from '../../infrastructure/persistence/solveRepository';

export interface IdGenerator {
  generate(): string;
}

export interface DateProvider {
  nowIso(): string;
}

export interface TimerApplicationDependencies {
  solveRepository: SolveRepository;
  scrambleGenerator: ScrambleGenerator;
  timerClock: TimerClock;
  idGenerator: IdGenerator;
  dateProvider: DateProvider;
}

export interface StatisticsSummary {
  readonly best: number | null;
  readonly mean: number | null;
  readonly ao5: Readonly<AverageResult>;
  readonly ao12: Readonly<AverageResult>;
  readonly ao100: Readonly<AverageResult>;
}

export type LoadState =
  | { readonly status: 'uninitialized' | 'loading' | 'ready' }
  | { readonly status: 'error'; readonly error: unknown };

export type ScrambleState =
  | { readonly status: 'uninitialized' | 'loading' | 'ready' }
  | { readonly status: 'error'; readonly error: unknown };

export type PendingMutation =
  | { readonly type: 'save' | 'update'; readonly solve: Readonly<Solve> }
  | { readonly type: 'delete'; readonly solveId: string };

export type PersistenceState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving'; readonly pending: PendingMutation }
  | {
      readonly status: 'error';
      readonly pending: PendingMutation;
      readonly error: unknown;
    };

export interface TimerApplicationState {
  readonly timer: TimerState;
  readonly history: LoadState;
  readonly currentScramble: Scramble | null;
  readonly scramble: ScrambleState;
  readonly persistence: PersistenceState;
  readonly solves: readonly Readonly<Solve>[];
  readonly statistics: StatisticsSummary;
  readonly canArm: boolean;
}
