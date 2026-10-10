import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { LANGUAGE_STORAGE_KEY } from './i18n';
import { timerApplicationFixture } from '../test/timerApplicationFixture';

vi.mock('../features/cube', () => ({
  CubeVisualization: ({ scramble }: { scramble: string }) => (
    <div role="img" aria-label={scramble} />
  ),
}));
beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'));
afterEach(() => localStorage.clear());

async function prepare() {
  const fixture = timerApplicationFixture();
  const view = render(<App {...fixture} />);
  await screen.findByText('R U2');
  return { ...fixture, ...view };
}
async function start(fixture: ReturnType<typeof timerApplicationFixture>) {
  await act(() =>
    fixture.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 }),
  );
  await act(() =>
    fixture.application.dispatchTimerEvent({
      type: 'HOLD_THRESHOLD_REACHED',
      now: 300,
      holdStartedAt: 0,
    }),
  );
  await act(() =>
    fixture.application.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 }),
  );
}

it('retains chrome through holding/ready, then makes it inert and inaccessible without unmounting it', async () => {
  const fixture = await prepare();
  const cube = screen.getByRole('button', { name: 'Enlarge cube' });
  const header = screen.getByRole('banner');
  await act(() =>
    fixture.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 }),
  );
  expect(header).not.toHaveAttribute('inert');
  expect(
    screen.getByRole('region', { name: 'Current scramble' }),
  ).toBeInTheDocument();
  await act(() =>
    fixture.application.dispatchTimerEvent({
      type: 'HOLD_THRESHOLD_REACHED',
      now: 300,
      holdStartedAt: 0,
    }),
  );
  expect(header).not.toHaveAttribute('aria-hidden');
  await act(() =>
    fixture.application.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 }),
  );
  expect(header).toHaveAttribute('inert');
  expect(header).toHaveAttribute('aria-hidden', 'true');
  expect(cube).toBeInTheDocument();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByRole('region', { name: 'Timer' })).toHaveFocus();
  expect(screen.getByText('Running · Press any key to stop')).toHaveClass(
    'sr-only',
  );
  expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
});

it('restores chrome on stop keydown before saving completes and never saves duplicate stops', async () => {
  const fixture = await prepare();
  let finish!: () => void;
  fixture.repository.save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await start(fixture);
  fixture.setTime(1641);
  fireEvent.keyDown(window, { code: 'KeyA', key: 'a' });
  expect(screen.getByRole('banner')).not.toHaveAttribute('inert');
  expect(
    screen.getByRole('region', { name: 'Current scramble' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('timer')).toHaveTextContent('1.241');
  expect(screen.getByText('Saving on this device…')).toBeInTheDocument();
  fireEvent.keyDown(window, { code: 'KeyA', key: 'a', repeat: true });
  expect(fixture.repository.save).toHaveBeenCalledTimes(1);
  fireEvent.keyUp(window, { code: 'KeyA', key: 'a' });
  await act(async () => finish());
  await waitFor(() =>
    expect(screen.getByTestId('recent-solve')).toBeInTheDocument(),
  );
  const note = screen.getByRole('button', { name: 'Note' });
  expect(note).toHaveAttribute('title', 'Note');
  expect(note.textContent).toBe('');
  expect(note.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute(
    'title',
    'Delete',
  );
  expect(screen.getByRole('button', { name: '+2' })).toHaveTextContent('+2');
  expect(screen.getByRole('button', { name: 'DNF' })).toHaveTextContent('DNF');
  expect(screen.queryByText('Result')).toBeNull();
  expect(screen.getByTestId('solve-announcement')).toHaveTextContent(
    'Solve completed: 1.241',
  );
});

it('restores scroll styles and position on stop and on unmount', async () => {
  const fixture = await prepare();
  document.documentElement.style.overflow = 'auto';
  const scroll = vi.spyOn(window, 'scrollTo');
  try {
    await start(fixture);
    expect(document.documentElement.style.overflow).toBe('hidden');
    await act(() =>
      fixture.application.dispatchTimerEvent({
        type: 'STOP_KEY_DOWN',
        now: 1641,
      }),
    );
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(scroll).toHaveBeenCalledWith(0, 0);
    await act(() =>
      fixture.application.dispatchTimerEvent({
        type: 'STOP_KEY_UP',
        now: 1642,
      }),
    );
    await start(fixture);
    fixture.unmount();
    expect(document.documentElement.style.overflow).toBe('auto');
  } finally {
    document.documentElement.style.overflow = '';
    scroll.mockRestore();
  }
});
