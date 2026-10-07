import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';
import {
  attachTimerKeyboard,
  ignoresTimerShortcut,
} from './keyboardController';

describe('keyboard controller', () => {
  let fixture: ReturnType<typeof timerApplicationFixture>;
  let dispose: () => void;
  const key = (
    type: 'keydown' | 'keyup',
    repeat = false,
    target: EventTarget = window,
  ) => {
    const event = new KeyboardEvent(type, {
      code: 'Space',
      key: ' ',
      repeat,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  };
  beforeEach(async () => {
    vi.useFakeTimers();
    fixture = timerApplicationFixture();
    await fixture.application.initialize();
    dispose = attachTimerKeyboard(fixture.application, fixture.clock, vi.fn());
  });
  afterEach(() => {
    dispose();
    vi.useRealTimers();
  });

  it('translates the full key cycle and suppresses scrolling and repeats', async () => {
    const dispatch = vi.spyOn(fixture.application, 'dispatchTimerEvent');
    expect(key('keydown').defaultPrevented).toBe(true);
    key('keydown', true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    fixture.setTime(299);
    vi.advanceTimersByTime(299);
    expect(fixture.application.getState().timer.status).toBe('holding');
    fixture.setTime(300);
    vi.advanceTimersByTime(1);
    expect(fixture.application.getState().timer.status).toBe('ready');
    fixture.setTime(380);
    key('keyup');
    expect(fixture.application.getState().timer).toEqual({
      status: 'running',
      startedAt: 380,
    });
    fixture.setTime(1400);
    key('keydown');
    key('keydown', true);
    expect(fixture.application.getState().timer.status).toBe('stopped');
    key('keyup');
    await vi.runAllTimersAsync();
    expect(fixture.repository.save).toHaveBeenCalledTimes(1);
    expect(fixture.application.getState().timer.status).toBe('idle');
  });

  it('cancels early release and all callbacks and listeners on cleanup', () => {
    key('keydown');
    fixture.setTime(100);
    key('keyup');
    fixture.setTime(400);
    vi.advanceTimersByTime(400);
    expect(fixture.application.getState().timer.status).toBe('idle');
    key('keydown');
    dispose();
    expect(vi.getTimerCount()).toBe(0);
    key('keydown');
    key('keyup');
    expect(fixture.application.getState().timer.status).toBe('idle');
  });

  it.each(['KeyA', 'Enter', 'Escape', 'ShiftLeft', 'ArrowDown'])(
    'stops with %s, ignores repeat and waits for that key to be released',
    async (code) => {
      key('keydown');
      fixture.setTime(300);
      vi.advanceTimersByTime(300);
      key('keyup');
      fixture.setTime(1500);
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code, repeat: true }),
      );
      expect(fixture.application.getState().timer.status).toBe('running');
      const stop = new KeyboardEvent('keydown', { code, cancelable: true });
      window.dispatchEvent(stop);
      expect(stop.defaultPrevented).toBe(true);
      expect(fixture.application.getState().timer.status).toBe('stopped');
      key('keyup');
      expect(fixture.application.getState().timer.status).toBe('stopped');
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      await vi.runAllTimersAsync();
      expect(fixture.application.getState().timer.status).toBe('idle');
      expect(fixture.repository.save).toHaveBeenCalledTimes(1);
      expect(fixture.application.getState().solves[0]?.rawTimeMs).toBe(1200);
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      expect(fixture.application.getState().timer.status).toBe('idle');
    },
  );

  it('reschedules an early timeout based on the domain response', () => {
    key('keydown');
    fixture.setTime(299);
    vi.advanceTimersByTime(300);
    expect(fixture.application.getState().timer.status).toBe('holding');
    fixture.setTime(300);
    vi.advanceTimersByTime(1);
    expect(fixture.application.getState().timer.status).toBe('ready');
  });

  it.each(['input', 'textarea', 'select', 'button', 'a'])(
    'ignores Space on %s without preventing native behavior',
    (tag) => {
      const target = document.createElement(tag);
      if (tag === 'a') target.setAttribute('href', '/');
      document.body.appendChild(target);
      expect(key('keydown', false, target).defaultPrevented).toBe(false);
      key('keyup', false, target);
      expect(fixture.application.getState().timer.status).toBe('idle');
      target.remove();
    },
  );

  it('recognizes nested contenteditable and note-editor targets', () => {
    const target = document.createElement('div');
    target.setAttribute('contenteditable', 'true');
    const child = target.appendChild(document.createElement('span'));
    expect(ignoresTimerShortcut(child)).toBe(true);
    target.setAttribute('contenteditable', 'false');
    expect(ignoresTimerShortcut(child)).toBe(false);
    target.setAttribute('data-timer-shortcuts', 'off');
    expect(ignoresTimerShortcut(child)).toBe(true);
  });

  it.each(['holding', 'ready'] as const)(
    'cancels %s on blur without starting on late release',
    (status) => {
      key('keydown');
      if (status === 'ready') {
        fixture.setTime(300);
        vi.advanceTimersByTime(300);
      }
      window.dispatchEvent(new Event('blur'));
      key('keyup');
      expect(fixture.application.getState().timer.status).toBe('idle');
      expect(fixture.repository.save).not.toHaveBeenCalled();
    },
  );

  it('cancels if focus moves into editing during a hold', () => {
    key('keydown');
    fixture.setTime(300);
    vi.advanceTimersByTime(300);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    key('keyup', false, input);
    expect(fixture.application.getState().timer.status).toBe('idle');
    input.remove();
  });

  it('does not arm while application readiness is blocked', () => {
    dispose();
    fixture = timerApplicationFixture();
    dispose = attachTimerKeyboard(fixture.application, fixture.clock, vi.fn());
    key('keydown');
    expect(fixture.application.getState().timer.status).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
  });
});
