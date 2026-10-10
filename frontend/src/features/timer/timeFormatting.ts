import {
  formatTimeMs,
  getEffectiveTimeMs,
  type Solve,
} from '../../domain/solves';

export type RunningDecimals = 0 | 1 | 2 | 3;
export type ResultDecimals = 2 | 3;

/** Presentation only: lower precision drops digits without rounding up. */
export function formatDisplayTimeMs(
  timeMs: number,
  decimals: RunningDecimals,
): string {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new RangeError('Time must be a finite, non-negative number');
  }
  if (decimals === 3) return formatTimeMs(timeMs);
  const unit = 10 ** (3 - decimals);
  const text = formatTimeMs(Math.floor(timeMs / unit) * unit);
  return text.slice(0, decimals === 0 ? -4 : decimals - 3);
}

export function formatDisplaySolveTime(
  solve: Readonly<Solve>,
  decimals: ResultDecimals,
): string {
  const timeMs = getEffectiveTimeMs(solve);
  if (timeMs === null) return 'DNF';
  return `${formatDisplayTimeMs(timeMs, decimals)}${solve.penalty === 'PLUS_TWO' ? '+' : ''}`;
}
