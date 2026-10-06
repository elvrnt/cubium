import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TimerDisplay } from './TimerDisplay';
import { StatisticsPanel } from './StatisticsPanel';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';

it('formats numeric statistics, DNF, and unavailable averages', () => {
  render(
    <StatisticsPanel
      statistics={{
        best: 8341,
        mean: null,
        ao5: { status: 'OK', timeMs: 63582 },
        ao12: { status: 'DNF' },
        ao50: { status: 'OK', timeMs: 12000 },
        ao100: { status: 'INSUFFICIENT_DATA' },
      }}
    />,
  );
  expect(screen.getByTestId('stat-best')).toHaveTextContent('8.341');
  expect(screen.getByTestId('stat-mean')).toHaveTextContent('—');
  expect(screen.getByTestId('stat-ao5')).toHaveTextContent('1:03.582');
  expect(screen.getByTestId('stat-ao12')).toHaveTextContent('DNF');
  expect(screen.getByTestId('stat-ao50')).toHaveTextContent('12.000');
  expect(screen.getByTestId('stat-ao100')).toHaveTextContent('—');
});

it('runs one frame loop only while running and cancels on stop and unmount', () => {
  const { application } = timerApplicationFixture();
  const read = vi
    .spyOn(application, 'getElapsedTimeMs')
    .mockReturnValue(8341.2);
  let frame!: FrameRequestCallback;
  const raf = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frame = callback;
      return 42;
    });
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation(() => {});
  try {
    const state = application.getState();
    const { rerender, unmount } = render(
      <TimerDisplay application={application} state={state} />,
    );
    expect(raf).not.toHaveBeenCalled();
    rerender(
      <TimerDisplay
        application={application}
        state={{ ...state, timer: { status: 'running', startedAt: 0 } }}
      />,
    );
    expect(raf).toHaveBeenCalledTimes(1);
    act(() => frame(0));
    expect(screen.getByRole('timer')).toHaveTextContent('8.341');
    expect(read).toHaveBeenCalledTimes(1);
    expect(application.getState()).toBe(state);
    rerender(
      <TimerDisplay
        application={application}
        state={{
          ...state,
          timer: {
            status: 'stopped',
            startedAt: 0,
            stoppedAt: 9000,
            elapsedMs: 9000,
          },
        }}
      />,
    );
    expect(cancel).toHaveBeenCalledExactlyOnceWith(42);
    rerender(
      <TimerDisplay
        application={application}
        state={{ ...state, timer: { status: 'running', startedAt: 10000 } }}
      />,
    );
    unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  } finally {
    raf.mockRestore();
    cancel.mockRestore();
    read.mockRestore();
  }
});
