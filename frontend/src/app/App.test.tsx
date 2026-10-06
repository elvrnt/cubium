import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from './i18n';
import { App } from './App';
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve } from '../test/solveFixtures';

vi.mock('../features/cube', () => ({
  CubeVisualization: ({ scramble }: { scramble: string }) => (
    <div role="img" aria-label={`Cube ${scramble}`} />
  ),
}));

describe('Timer page', () => {
  beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'));
  afterEach(() => localStorage.clear());
  it('initializes once in StrictMode and unsubscribes cleanly', async () => {
    const fixture = timerApplicationFixture();
    const originalSubscribe = fixture.application.subscribe;
    const unsubscribe = vi.fn();
    const subscribe = vi
      .spyOn(fixture.application, 'subscribe')
      .mockImplementation((listener) => {
        const release = originalSubscribe(listener);
        return () => {
          unsubscribe();
          release();
        };
      });
    const { unmount } = render(
      <StrictMode>
        <App {...fixture} />
      </StrictMode>,
    );
    expect(screen.getByText('Loading solve history…')).toBeVisible();
    expect(screen.queryByLabelText('Statistics')).not.toBeInTheDocument();
    expect(await screen.findByText('R U2')).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent('0.000');
    expect(fixture.repository.getAll).toHaveBeenCalledTimes(1);
    expect(fixture.generator.generate333).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(subscribe.mock.calls.length);
  });

  it('surfaces history and scramble failures with separate retry actions', async () => {
    const fixture = timerApplicationFixture();
    fixture.repository.getAll.mockRejectedValueOnce(new Error('load'));
    fixture.generator.generate333.mockRejectedValueOnce(new Error('generate'));
    render(<App {...fixture} />);
    expect(
      await screen.findByText('Could not load solve history'),
    ).toBeVisible();
    expect(screen.queryByLabelText('Statistics')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry scramble' }),
    );
    expect(await screen.findByText('R U2')).toBeVisible();
    expect(fixture.repository.getAll).toHaveBeenCalledTimes(2);
  });

  it('wires latest penalty toggles, note save/cancel and confirmed deletion', async () => {
    const solve = makeSolve({
      id: 'latest',
      rawTimeMs: 10000,
      note: 'old note',
    });
    const fixture = timerApplicationFixture([solve]);
    render(<App {...fixture} />);
    await screen.findByText('R U2');
    const plus = screen.getByRole('button', { name: '+2' });
    fireEvent.click(plus);
    await waitFor(() => expect(plus).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByTestId('stat-best')).toHaveTextContent('12.000');
    fireEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await waitFor(() =>
      expect(screen.getByTestId('stat-best')).toHaveTextContent('—'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await waitFor(() =>
      expect(screen.getByTestId('stat-best')).toHaveTextContent('10.000'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    const input = screen.getByRole('textbox', {
      name: 'Note for solve',
    });
    expect(input).toHaveValue('old note');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'new note with spaces' } });
    fireEvent.keyDown(input, { code: 'Space', key: ' ' });
    fireEvent.keyUp(input, { code: 'Space', key: ' ' });
    expect(fixture.application.getState().timer.status).toBe('idle');
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() =>
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Note' })).toHaveFocus();
    expect(fixture.records.get(solve.id)?.note).toBe('new note with spaces');
    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'discard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fixture.records.get(solve.id)?.note).toBe('new note with spaces');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(fixture.repository.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(
      await screen.findByText('No solves yet. Take your time.'),
    ).toBeVisible();
    expect(fixture.repository.delete).toHaveBeenCalledExactlyOnceWith(solve.id);
  });

  it('keeps failed solve visible and wires persistence retry', async () => {
    const fixture = timerApplicationFixture();
    fixture.repository.save.mockRejectedValueOnce(new Error('disk'));
    render(<App {...fixture} />);
    await screen.findByText('R U2');
    await act(async () => {
      await fixture.application.dispatchTimerEvent({
        type: 'START_KEY_DOWN',
        now: 0,
      });
      await fixture.application.dispatchTimerEvent({
        type: 'HOLD_THRESHOLD_REACHED',
        now: 300,
        holdStartedAt: 0,
      });
      await fixture.application.dispatchTimerEvent({
        type: 'START_KEY_UP',
        now: 400,
      });
      await fixture.application.dispatchTimerEvent({
        type: 'STOP_KEY_DOWN',
        now: 1641,
      });
      await fixture.application.dispatchTimerEvent({
        type: 'STOP_KEY_UP',
        now: 1642,
      });
    });
    expect(screen.getByRole('timer')).toHaveTextContent('1.241');
    expect(screen.getByRole('alert')).toHaveTextContent('still held in memory');
    expect(fixture.application.getState().canArm).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('recent-solve')).toHaveTextContent('1.241');
    expect(fixture.records.size).toBe(1);
  });

  it('renders newest 20 first without reordering application history', async () => {
    const solves = Array.from({ length: 22 }, (_, i) =>
      makeSolve({
        id: `solve-${i.toString().padStart(2, '0')}`,
        rawTimeMs: (i + 1) * 1000,
      }),
    );
    const fixture = timerApplicationFixture(solves);
    render(<App {...fixture} />);
    await screen.findByText('R U2');
    const results = screen.getAllByTestId('recent-solve');
    expect(results).toHaveLength(20);
    expect(results[0]).toHaveTextContent('22.000');
    expect(results[19]).toHaveTextContent('3.000');
    expect(
      fixture.application.getState().solves.map((solve) => solve.id),
    ).toEqual(solves.map((solve) => solve.id));
  });
});
