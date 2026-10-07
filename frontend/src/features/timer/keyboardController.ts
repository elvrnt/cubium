import type { TimerApplication } from '../../application/timer';
import { DEFAULT_HOLD_THRESHOLD_MS } from '../../domain/timer';
import type { TimerClock, TimerEvent } from '../../domain/timer';

/** Buttons/links retain native Space activation as well as text editing. */
export function ignoresTimerShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'input, textarea, select, button, a[href], [role="textbox"], [data-timer-shortcuts="off"]',
    )
  )
    return true;
  const editable = target.closest('[contenteditable]');
  return (
    editable !== null && editable.getAttribute('contenteditable') !== 'false'
  );
}

export function attachTimerKeyboard(
  application: TimerApplication,
  clock: TimerClock,
  onError: (error: unknown) => void,
) {
  let ownedKey: string | null = null;
  let timeout: number | undefined;
  let scheduledHold: number | undefined;
  const dispatch = (event: TimerEvent) => {
    void application.dispatchTimerEvent(event).catch(onError);
  };
  const clearHold = () => {
    window.clearTimeout(timeout);
    timeout = undefined;
    scheduledHold = undefined;
  };
  const synchronizeHold = () => {
    const timer = application.getState().timer;
    if (timer.status !== 'holding') {
      clearHold();
      return;
    }
    if (scheduledHold === timer.holdStartedAt) return;
    clearHold();
    const holdStartedAt = timer.holdStartedAt;
    scheduledHold = holdStartedAt;
    const deliver = () => {
      dispatch({
        type: 'HOLD_THRESHOLD_REACHED',
        now: clock.now(),
        holdStartedAt,
      });
      // The domain decides readiness. If a callback fired early, try again.
      const current = application.getState().timer;
      if (
        current.status === 'holding' &&
        current.holdStartedAt === holdStartedAt
      ) {
        timeout = window.setTimeout(
          deliver,
          Math.max(
            1,
            DEFAULT_HOLD_THRESHOLD_MS - (clock.now() - holdStartedAt),
          ),
        );
      }
    };
    timeout = window.setTimeout(
      deliver,
      Math.max(0, DEFAULT_HOLD_THRESHOLD_MS - (clock.now() - holdStartedAt)),
    );
  };
  const targetIsProtected = (event: KeyboardEvent) =>
    event.composedPath().some(ignoresTimerShortcut) ||
    ignoresTimerShortcut(event.target);
  const cancelPress = () => {
    ownedKey = null;
    clearHold();
    const status = application.getState().timer.status;
    if (status === 'holding' || status === 'ready')
      dispatch({ type: 'CANCEL_HOLD', now: clock.now() });
    if (status === 'stopped')
      dispatch({ type: 'STOP_KEY_UP', now: clock.now() });
  };
  const keydown = (event: KeyboardEvent) => {
    const state = application.getState();
    if (state.timer.status === 'running') {
      event.preventDefault();
      if (event.repeat || ownedKey !== null) return;
      ownedKey = event.code || event.key;
      dispatch({ type: 'STOP_KEY_DOWN', now: clock.now() });
      return;
    }
    if (
      event.code !== 'Space' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      targetIsProtected(event)
    )
      return;
    event.preventDefault();
    if (event.repeat || ownedKey !== null) return;
    if (state.canArm) {
      ownedKey = event.code;
      dispatch({ type: 'START_KEY_DOWN', now: clock.now() });
    }
  };
  const keyup = (event: KeyboardEvent) => {
    if (ownedKey === null || (event.code || event.key) !== ownedKey) return;
    if (targetIsProtected(event)) {
      cancelPress();
      return;
    }
    event.preventDefault();
    ownedKey = null;
    clearHold();
    const status = application.getState().timer.status;
    dispatch({
      type: status === 'stopped' ? 'STOP_KEY_UP' : 'START_KEY_UP',
      now: clock.now(),
    });
  };
  const focusin = (event: FocusEvent) => {
    if (ownedKey !== null && ignoresTimerShortcut(event.target)) cancelPress();
  };
  const visibility = () => {
    if (document.hidden) cancelPress();
  };
  const unsubscribe = application.subscribe(synchronizeHold);
  synchronizeHold();
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', cancelPress);
  document.addEventListener('focusin', focusin);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    unsubscribe();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', cancelPress);
    document.removeEventListener('focusin', focusin);
    document.removeEventListener('visibilitychange', visibility);
    cancelPress();
  };
}
