export type SolvePenalty = 'NONE' | 'PLUS_TWO' | 'DNF';

/** Source data: unique id, non-negative integer milliseconds, valid ISO timestamp. */
export interface Solve {
  id: string;
  event: '333';
  scramble: string;
  rawTimeMs: number;
  penalty: SolvePenalty;
  note: string | null;
  createdAt: string;
}

/** A DNF has no numeric effective time. The raw duration is never changed. */
export function getEffectiveTimeMs(solve: Readonly<Solve>): number | null {
  switch (solve.penalty) {
    case 'NONE':
      return solve.rawTimeMs;
    case 'PLUS_TWO':
      return solve.rawTimeMs + 2000;
    case 'DNF':
      return null;
  }
}

/** Ascending effective result, with all DNFs tied after numeric results. */
export function compareSolves(
  left: Readonly<Solve>,
  right: Readonly<Solve>,
): number {
  const leftTime = getEffectiveTimeMs(left);
  const rightTime = getEffectiveTimeMs(right);

  if (leftTime === null) return rightTime === null ? 0 : 1;
  if (rightTime === null) return -1;
  return leftTime - rightTime;
}

/** Oldest first by instant, then id in ascending, locale-independent order. */
export function compareSolvesChronologically(
  left: Readonly<Solve>,
  right: Readonly<Solve>,
): number {
  const chronologicalOrder =
    Date.parse(left.createdAt) - Date.parse(right.createdAt);
  if (chronologicalOrder !== 0) return chronologicalOrder;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
