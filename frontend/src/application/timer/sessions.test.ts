// @vitest-environment node
import { expect, it } from 'vitest';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';
import { makeSolve } from '../../test/solveFixtures';
import type { TimerApplication } from './timerApplication';
async function cycle(app: TimerApplication, origin = 0) {
  await app.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: origin });
  await app.dispatchTimerEvent({
    type: 'HOLD_THRESHOLD_REACHED',
    now: origin + 300,
    holdStartedAt: origin,
  });
  await app.dispatchTimerEvent({ type: 'START_KEY_UP', now: origin + 400 });
  await app.dispatchTimerEvent({ type: 'STOP_KEY_DOWN', now: origin + 10400 });
  await app.dispatchTimerEvent({ type: 'STOP_KEY_UP', now: origin + 10401 });
}
it('switches isolated collections, resets the result, keeps the scramble and saves successive solves to the correct session', async () => {
  const f = timerApplicationFixture([makeSolve()]);
  await f.application.initialize();
  const main = f.application.getState().activeSessionId!;
  await cycle(f.application);
  const scramble = f.application.getState().currentScramble;
  await f.application.createSession('  Practice  ');
  const other = f.application.getState().activeSessionId!;
  expect(f.application.getState()).toMatchObject({
    displayedSolveId: null,
    solves: [],
    statistics: { best: null },
    timer: { status: 'idle' },
  });
  expect(f.application.getState().currentScramble).toBe(scramble);
  await cycle(f.application, 20000);
  expect(f.application.getState().solves).toHaveLength(1);
  const solve = f.application.getState().solves[0]!;
  expect(solve.sessionId).toBe(other);
  await f.application.setPenalty(solve.id, 'PLUS_TWO');
  await f.application.updateNote(solve.id, 'memo');
  expect(f.application.getState().statistics.best).toBe(12000);
  await f.application.selectSession(main);
  expect(f.application.getState().solves).toHaveLength(2);
  expect(
    f.application.getState().solves.every((s) => s.sessionId === main),
  ).toBe(true);
  await f.application.selectSession(other);
  expect(f.application.getState().solves[0]).toMatchObject({
    note: 'memo',
    penalty: 'PLUS_TWO',
  });
});
it('retains the exact session command and draft on failure, retries once without duplicating creation', async () => {
  const f = timerApplicationFixture();
  await f.application.loadHistory();
  const before = f.application.getState();
  f.repository.mutateSession.mockRejectedValueOnce(new Error('write'));
  await f.application.createSession('Practice');
  expect(f.application.getState().activeSessionId).toBe(before.activeSessionId);
  expect(f.application.getState().sessions).toEqual(before.sessions);
  await expect(f.application.createSession('Blocked')).rejects.toThrow();
  await f.application.retryPersistence();
  await f.application.retryPersistence();
  expect(f.application.getState().sessions).toHaveLength(2);
  expect(f.repository.mutateSession.mock.calls[0]?.[0]).toBe(
    f.repository.mutateSession.mock.calls[1]?.[0],
  );
});
it('blocks session mutations in a result editor and through holding, ready and running', async () => {
  const f = timerApplicationFixture();
  await f.application.initialize();
  f.application.setEditingBlocked(true);
  await expect(f.application.createSession('Blocked')).rejects.toThrow();
  f.application.setEditingBlocked(false);
  await f.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
  await expect(f.application.createSession('Blocked')).rejects.toThrow();
  await f.application.dispatchTimerEvent({
    type: 'HOLD_THRESHOLD_REACHED',
    now: 300,
    holdStartedAt: 0,
  });
  await expect(f.application.createSession('Blocked')).rejects.toThrow();
  await f.application.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 });
  await expect(f.application.createSession('Blocked')).rejects.toThrow();
  expect(f.repository.mutateSession).not.toHaveBeenCalled();
});
it('save retry keeps its original session identity and archive/delete change both pages’ shared collection', async () => {
  const f = timerApplicationFixture();
  await f.application.initialize();
  await f.application.createSession('Practice');
  const other = f.application.getState().activeSessionId!;
  f.repository.save.mockRejectedValueOnce(new Error('write'));
  await cycle(f.application);
  await expect(
    f.application.selectSession('test-main-session'),
  ).rejects.toThrow();
  await f.application.retryPersistence();
  expect(f.application.getState().solves[0]?.sessionId).toBe(other);
  await f.application.archiveSession(other);
  expect(f.application.getState().activeSessionId).toBe('test-main-session');
  expect(f.application.getState().sessionSolveCounts[other]).toBe(1);
  await f.application.restoreSession(other);
  expect(f.application.getState().activeSessionId).toBe('test-main-session');
  await f.application.deleteSession(other);
  expect(f.application.getState().sessionSolveCounts[other]).toBeUndefined();
});
