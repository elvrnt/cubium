// @vitest-environment node
import { expect, it } from 'vitest';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';
import { makeSolve } from '../../test/solveFixtures';

it('loads history once without generating a scramble or enabling timing', async () => {
  const f = timerApplicationFixture([makeSolve()]);
  await Promise.all([f.application.loadHistory(), f.application.loadHistory()]);
  await f.application.loadHistory();
  expect(f.repository.getAll).toHaveBeenCalledTimes(1);
  expect(f.generator.generate333).not.toHaveBeenCalled();
  expect(f.application.getState()).toMatchObject({
    history: { status: 'ready' },
    scramble: { status: 'uninitialized' },
    canArm: false,
  });
});
it('initializes a timer after Results without reloading history', async () => {
  const f = timerApplicationFixture([makeSolve()]);
  await f.application.loadHistory();
  await Promise.all([f.application.initialize(), f.application.initialize()]);
  await f.application.initialize();
  expect(f.repository.getAll).toHaveBeenCalledTimes(1);
  expect(f.generator.generate333).toHaveBeenCalledTimes(1);
  expect(f.application.getState().canArm).toBe(true);
});
it('shares concurrent Results and Timer startup without duplicate reads or scrambles', async () => {
  const f = timerApplicationFixture();
  await Promise.all([
    f.application.loadHistory(),
    f.application.initialize(),
    f.application.initialize(),
  ]);
  expect(f.repository.getAll).toHaveBeenCalledTimes(1);
  expect(f.generator.generate333).toHaveBeenCalledTimes(1);
});
it('retains history errors and retries independently from scramble generation', async () => {
  const f = timerApplicationFixture([makeSolve()]);
  f.repository.getAll.mockRejectedValueOnce(new Error('read'));
  await f.application.loadHistory();
  expect(f.application.getState().history.status).toBe('error');
  await f.application.loadHistory();
  expect(f.application.getState().solves).toHaveLength(1);
  expect(f.generator.generate333).not.toHaveBeenCalled();
});
it('does not reset the Timer state or current scramble on a repeated history read', async () => {
  const f = timerApplicationFixture();
  await f.application.initialize();
  await f.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
  const before = f.application.getState();
  await f.application.loadHistory();
  expect(f.application.getState()).toBe(before);
});
