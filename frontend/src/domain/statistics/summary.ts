import type { Solve } from '../solves';
import {
  calculateAo5,
  calculateAo12,
  calculateAo50,
  calculateAo100,
  calculateBest,
  calculateMean,
} from './statistics';

/** Derived from source records only; never persisted. */
export function calculateStatistics(solves: readonly Solve[]) {
  return Object.freeze({
    best: calculateBest(solves),
    mean: calculateMean(solves),
    ao5: Object.freeze(calculateAo5(solves)),
    ao12: Object.freeze(calculateAo12(solves)),
    ao50: Object.freeze(calculateAo50(solves)),
    ao100: Object.freeze(calculateAo100(solves)),
  });
}
