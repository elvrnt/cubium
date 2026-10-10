import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TimerDisplay } from './TimerDisplay';
import { StatisticsPanel } from './StatisticsPanel';
import { timerApplicationFixture } from '../../test/timerApplicationFixture';
import { makeSolve } from '../../test/solveFixtures';

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
    const original = application.getState();
    const solve = makeSolve({ rawTimeMs: 8341 });
    const state = { ...original, solves: [solve], displayedSolveId: solve.id };
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
    expect(screen.getByRole('timer')).toHaveTextContent(/^8\.34$/);
    expect(read).toHaveBeenCalledTimes(1);
    expect(application.getState()).toBe(original);
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
    expect(screen.getByRole('timer')).toHaveTextContent(/^8\.341$/);
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

it.each([
  [999.9, '0.99'],
  [1000, '1.00'],
  [59999.9, '59.99'],
  [60000, '1:00.00'],
  [63582.8, '1:03.58'],
])('shows hundredths by default while running at %s ms', (elapsed, text) => {
  const { application } = timerApplicationFixture();
  vi.spyOn(application, 'getElapsedTimeMs').mockReturnValue(elapsed);
  let frame!: FrameRequestCallback;
  const raf = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frame = callback;
      return 42;
    });
  try {
    render(
      <TimerDisplay
        application={application}
        state={{
          ...application.getState(),
          timer: { status: 'running', startedAt: 0 },
        }}
      />,
    );
    act(() => frame(0));
    expect(screen.getByRole('timer').textContent).toBe(text);
  } finally {
    raf.mockRestore();
    vi.restoreAllMocks();
  }
});
