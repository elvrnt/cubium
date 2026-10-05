import type { Solve, SolvePenalty } from './solve';

/** Replaces any previous penalty; NONE removes it. Applying twice is idempotent. */
export function setSolvePenalty(
  solve: Readonly<Solve>,
  penalty: SolvePenalty,
): Solve {
  return { ...solve, penalty };
}
