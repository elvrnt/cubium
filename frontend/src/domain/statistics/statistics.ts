import {
  compareSolves,
  compareSolvesChronologically,
  getEffectiveTimeMs,
} from '../solves';
import type { Solve } from '../solves';

export type AverageResult =
  | { status: 'OK'; timeMs: number }
  | { status: 'DNF' }
  | { status: 'INSUFFICIENT_DATA' };

export function calculateBest(solves: readonly Solve[]): number | null {
  let best: number | null = null;
  for (const solve of solves) {
    const timeMs = getEffectiveTimeMs(solve);
    if (timeMs !== null && (best === null || timeMs < best)) {
      best = timeMs;
    }
  }
  return best;
}

/** Ignores DNFs and preserves fractional milliseconds without rounding. */
export function calculateMean(solves: readonly Solve[]): number | null {
  let total = 0;
  let validCount = 0;
  for (const solve of solves) {
    const timeMs = getEffectiveTimeMs(solve);
    if (timeMs !== null) {
      total += timeMs;
      validCount += 1;
    }
  }
  return validCount === 0 ? null : total / validCount;
}

/**
 * Latest N by timestamp, then id ascending (code-unit order); higher ids are
 * later when timestamps tie. Requires valid timestamps and unique solve ids.
 * Trims ceil(N * 0.05) from each end. No arithmetic rounding is performed.
 */
export function calculateAverageOf(
  solves: readonly Solve[],
  count: number,
): AverageResult {
  if (!Number.isSafeInteger(count) || count < 3) {
    throw new RangeError('Average count must be a safe integer of at least 3');
  }
  if (solves.length < count) return { status: 'INSUFFICIENT_DATA' };

  const latest = [...solves]
    .sort(compareSolvesChronologically)
    .slice(-count)
    .sort(compareSolves);

  const trimCount = Math.ceil(count * 0.05);
  const remaining = latest.slice(trimCount, count - trimCount);
  let total = 0;
  for (const solve of remaining) {
    const timeMs = getEffectiveTimeMs(solve);
    if (timeMs === null) return { status: 'DNF' };
    total += timeMs;
  }
  return { status: 'OK', timeMs: total / remaining.length };
}

export function calculateAo5(solves: readonly Solve[]): AverageResult {
  return calculateAverageOf(solves, 5);
}

export function calculateAo12(solves: readonly Solve[]): AverageResult {
  return calculateAverageOf(solves, 12);
}

export function calculateAo100(solves: readonly Solve[]): AverageResult {
  return calculateAverageOf(solves, 100);
}

export function calculateAo50(solves: readonly Solve[]): AverageResult {
  return calculateAverageOf(solves, 50);
}
