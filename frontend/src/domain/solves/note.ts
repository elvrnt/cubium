import type { Solve } from './solve';

/** UTF-16 code units, matching HTML maxLength and JavaScript string.length. */
export const MAX_SOLVE_NOTE_LENGTH = 300;

export function setSolveNote(
  solve: Readonly<Solve>,
  note: string | null,
): Solve {
  if (note !== null && note.length > MAX_SOLVE_NOTE_LENGTH) {
    throw new RangeError(
      `Solve note exceeds ${MAX_SOLVE_NOTE_LENGTH} characters`,
    );
  }
  return { ...solve, note };
}
