import { getEffectiveTimeMs } from './solve';
import type { Solve } from './solve';

/** Round only for display, to the nearest millisecond (half milliseconds up). */
export function formatTimeMs(timeMs: number): string {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new RangeError('Time must be a finite, non-negative number');
  }

  const roundedMs = Math.round(timeMs);
  const minutes = Math.floor(roundedMs / 60_000);
  const seconds = Math.floor((roundedMs % 60_000) / 1000);
  const milliseconds = String(roundedMs % 1000).padStart(3, '0');
  const secondsText = minutes > 0 ? String(seconds).padStart(2, '0') : seconds;

  return `${minutes > 0 ? `${minutes}:` : ''}${secondsText}.${milliseconds}`;
}

export function formatSolveTime(solve: Readonly<Solve>): string {
  const timeMs = getEffectiveTimeMs(solve);
  if (timeMs === null) return 'DNF';

  return `${formatTimeMs(timeMs)}${solve.penalty === 'PLUS_TWO' ? '+' : ''}`;
}
