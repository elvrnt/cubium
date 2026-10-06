import { TimerApplication } from '../application/timer';
import { cubingScrambleGenerator } from '../infrastructure/cubing';
import { createSolveRepository } from '../infrastructure/persistence';
import {
  cryptoIdGenerator,
  systemDateProvider,
} from '../infrastructure/platform';
import { performanceClock } from '../infrastructure/timer';

/** Called once by the browser entry, outside React's StrictMode render cycle. */
export function createTimerApplication() {
  const repository = createSolveRepository();
  return {
    application: new TimerApplication({
      solveRepository: repository,
      scrambleGenerator: cubingScrambleGenerator,
      timerClock: performanceClock,
      idGenerator: cryptoIdGenerator,
      dateProvider: systemDateProvider,
    }),
    clock: performanceClock,
    close: () => repository.close(),
  };
}
