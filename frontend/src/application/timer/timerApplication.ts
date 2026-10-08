import type { Solve, SolvePenalty } from '../../domain/solves';
import {
  compareSolvesChronologically,
  setSolvePenalty,
  setSolveNote,
} from '../../domain/solves';
import { calculateStatistics } from '../../domain/statistics';
import {
  createInitialTimerState,
  getElapsedTimeMs,
  transitionTimer,
} from '../../domain/timer';
import type { TimerEvent } from '../../domain/timer';
import { SolveNotFoundError } from '../../infrastructure/persistence/solveRepository';
import type {
  PendingMutation,
  TimerApplicationDependencies,
  TimerApplicationState,
} from './contracts';

/** One local timer use case. Injected adapters are owned and closed by the caller. */
export class TimerApplication {
  private historyLoad: Promise<void> | null = null;
  private initialization: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private state: TimerApplicationState = Object.freeze({
    timer: Object.freeze(createInitialTimerState()),
    history: Object.freeze({ status: 'uninitialized' }),
    currentScramble: null,
    displayedSolveId: null,
    scramble: Object.freeze({ status: 'uninitialized' }),
    persistence: Object.freeze({ status: 'idle' }),
    solves: Object.freeze([]),
    statistics: calculateStatistics([]),
    canArm: false,
  });

  constructor(private readonly dependencies: TimerApplicationDependencies) {}

  getState = (): TimerApplicationState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getElapsedTimeMs(): number {
    return getElapsedTimeMs(
      this.state.timer,
      this.dependencies.timerClock.now(),
    );
  }

  private publish(patch: Partial<TimerApplicationState>): void {
    const next = { ...this.state, ...patch };
    next.canArm =
      next.timer.status === 'idle' &&
      next.history.status === 'ready' &&
      next.scramble.status === 'ready' &&
      next.currentScramble !== null &&
      next.persistence.status === 'idle';
    this.state = Object.freeze({
      ...next,
      timer: Object.freeze(next.timer),
      history: Object.freeze(next.history),
      scramble: Object.freeze(next.scramble),
      persistence: Object.freeze(next.persistence),
    });
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue;
      try {
        listener();
      } catch (error) {
        // An observer must not interrupt a save or turn success into failure.
        console.error('Timer application subscriber failed', error);
      }
    }
  }

  private collection(solves: readonly Solve[]) {
    const ordered = Object.freeze(
      solves
        .map((solve) => Object.freeze({ ...solve }))
        .sort(compareSolvesChronologically),
    );
    return { solves: ordered, statistics: calculateStatistics(ordered) };
  }

  /** Shared single-flight read. Results can load history without a scramble. */
  loadHistory(): Promise<void> {
    if (this.historyLoad) return this.historyLoad;
    if (this.state.history.status === 'ready') return Promise.resolve();
    // Defer the read so the promise is reserved before observers are notified.
    this.historyLoad = Promise.resolve()
      .then(() => this.readHistory())
      .finally(() => {
        this.historyLoad = null;
      });
    this.publish({ history: { status: 'loading' } });
    return this.historyLoad;
  }

  private async readHistory(): Promise<void> {
    let solves: Solve[];
    try {
      solves = await this.dependencies.solveRepository.getAll();
    } catch (error) {
      this.publish({ history: { status: 'error', error } });
      return;
    }
    this.publish({
      ...this.collection(solves),
      history: { status: 'ready' },
      displayedSolveId: null,
    });
  }

  /** Idempotent startup; a successful Results read needs only scramble startup. */
  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = this.loadHistory()
      .then(async () => {
        if (
          this.state.history.status !== 'ready' ||
          this.state.scramble.status !== 'uninitialized'
        )
          return;
        this.publish({ scramble: { status: 'loading' } });
        await this.generateScramble();
      })
      .finally(() => {
        this.initialization = null;
      });
    return this.initialization;
  }

  private async generateScramble(): Promise<void> {
    try {
      const scramble = await this.dependencies.scrambleGenerator.generate333();
      this.publish({
        currentScramble: Object.freeze({ ...scramble }),
        scramble: { status: 'ready' },
      });
    } catch (error) {
      this.publish({ scramble: { status: 'error', error } });
    }
  }

  async retryScramble(): Promise<void> {
    if (this.state.scramble.status !== 'error') return;
    this.publish({ scramble: { status: 'loading' } });
    await this.generateScramble();
  }

  /** Timer transitions happen synchronously; awaiting a stop waits for its workflow. */
  async dispatchTimerEvent(event: TimerEvent): Promise<void> {
    if (
      this.state.timer.status === 'idle' &&
      event.type === 'START_KEY_DOWN' &&
      !this.state.canArm
    )
      return;
    const result = transitionTimer(this.state.timer, event);
    if (result.state === this.state.timer) return;
    if (!result.effect) {
      this.publish({ timer: result.state });
      return;
    }
    // Arming is gated, and the scramble cannot change during an active cycle.
    const scramble = this.state.currentScramble!;
    const solve: Readonly<Solve> = Object.freeze({
      id: this.dependencies.idGenerator.generate(),
      event: '333',
      scramble: scramble.notation,
      rawTimeMs: Math.round(result.effect.elapsedMs),
      penalty: 'NONE',
      note: null,
      createdAt: this.dependencies.dateProvider.nowIso(),
    });
    const pending = Object.freeze({ type: 'save' as const, solve });
    // Lock and retain the stopped state before subscribers or async work run.
    this.publish({
      timer: result.state,
      persistence: { status: 'saving', pending },
      displayedSolveId: solve.id,
    });
    await this.persist(pending);
  }

  private requireEditable(): void {
    if (
      this.state.history.status !== 'ready' ||
      this.state.persistence.status !== 'idle' ||
      !['idle', 'stopped'].includes(this.state.timer.status)
    ) {
      throw new Error('Timer application is busy or not ready for editing');
    }
  }

  private findSolve(id: string): Readonly<Solve> {
    const solve = this.state.solves.find((item) => item.id === id);
    if (!solve) throw new SolveNotFoundError(id);
    return solve;
  }

  async setPenalty(id: string, penalty: SolvePenalty): Promise<void> {
    this.requireEditable();
    await this.update(setSolvePenalty(this.findSolve(id), penalty));
  }

  async updateNote(id: string, note: string | null): Promise<void> {
    this.requireEditable();
    await this.update(setSolveNote(this.findSolve(id), note));
  }

  private async update(solve: Solve): Promise<void> {
    const pending = Object.freeze({
      type: 'update' as const,
      solve: Object.freeze(solve),
    });
    this.publish({ persistence: { status: 'saving', pending } });
    await this.persist(pending);
  }

  async deleteSolve(id: string): Promise<void> {
    this.requireEditable();
    const pending = Object.freeze({ type: 'delete' as const, solveId: id });
    this.publish({ persistence: { status: 'saving', pending } });
    await this.persist(pending);
  }

  async retryPersistence(): Promise<void> {
    if (this.state.persistence.status !== 'error') return;
    const { pending } = this.state.persistence;
    this.publish({ persistence: { status: 'saving', pending } });
    await this.persist(pending);
  }

  private async persist(pending: PendingMutation): Promise<void> {
    const repository = this.dependencies.solveRepository;
    try {
      switch (pending.type) {
        case 'save':
          await repository.save(pending.solve);
          break;
        case 'update':
          await repository.update(pending.solve);
          break;
        case 'delete':
          await repository.delete(pending.solveId);
          break;
      }
    } catch (error) {
      this.publish({ persistence: { status: 'error', pending, error } });
      return;
    }
    const solves =
      pending.type === 'delete'
        ? this.state.solves.filter((solve) => solve.id !== pending.solveId)
        : [
            ...this.state.solves.filter(
              (solve) => solve.id !== pending.solve.id,
            ),
            pending.solve,
          ];
    if (pending.type === 'save') {
      this.publish({
        ...this.collection(solves),
        persistence: { status: 'idle' },
        currentScramble: null,
        scramble: { status: 'loading' },
      });
      await this.generateScramble();
    } else {
      this.publish({
        ...this.collection(solves),
        displayedSolveId:
          pending.type === 'delete' &&
          pending.solveId === this.state.displayedSolveId
            ? null
            : this.state.displayedSolveId,
        persistence: { status: 'idle' },
      });
    }
  }
}
