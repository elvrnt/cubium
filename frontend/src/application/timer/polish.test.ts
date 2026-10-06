// @vitest-environment node
import { expect, it } from 'vitest';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';
import { makeSolve } from '../../test/solveFixtures';
import { MAX_SOLVE_NOTE_LENGTH, setSolveNote } from '../../domain/solves';

it.each([0, 299, 300])(
  'accepts a %i-character note and preserves all other fields',
  async (length) => {
    const solve = Object.freeze(makeSolve({ penalty: 'PLUS_TWO' }));
    const { application, records } = timerApplicationFixture([solve]);
    await application.initialize();
    const note = ' '.repeat(length);
    await application.updateNote(solve.id, note);
    expect(records.get(solve.id)).toEqual({ ...solve, note });
    expect(solve.note).toBeNull();
  },
);
it('rejects 301 characters before persistence without truncation', async () => {
  const solve = makeSolve();
  const { application, repository } = timerApplicationFixture([solve]);
  await application.initialize();
  const snapshot = application.getState();
  await expect(
    application.updateNote(solve.id, 'x'.repeat(MAX_SOLVE_NOTE_LENGTH + 1)),
  ).rejects.toThrow(RangeError);
  expect(repository.update).not.toHaveBeenCalled();
  expect(application.getState()).toBe(snapshot);
  expect(setSolveNote(solve, null).note).toBeNull();
});
it('clears only the displayed solve after durable deletion; next completion selects itself', async () => {
  const a = makeSolve({ id: 'a' });
  const b = makeSolve({ id: 'b' });
  const { application: app, repository } = timerApplicationFixture([a, b]);
  await app.initialize();
  expect(app.getState().displayedSolveId).toBe('b');
  await app.setPenalty('a', 'PLUS_TWO');
  expect(app.getState().displayedSolveId).toBe('b');
  repository.delete.mockRejectedValueOnce(new Error('disk'));
  await app.deleteSolve('b');
  expect(app.getState().displayedSolveId).toBe('b');
  await app.retryPersistence();
  expect(app.getState().displayedSolveId).toBeNull();
  expect(app.getState().solves.map((s) => s.id)).toEqual(['a']);
  await app.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
  await app.dispatchTimerEvent({
    type: 'HOLD_THRESHOLD_REACHED',
    now: 300,
    holdStartedAt: 0,
  });
  await app.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 });
  await app.dispatchTimerEvent({ type: 'STOP_KEY_DOWN', now: 1000 });
  await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: 1001 });
  expect(app.getState().displayedSolveId).toBe('solve-1');
  await app.deleteSolve('a');
  expect(app.getState().displayedSolveId).toBe('solve-1');
});
