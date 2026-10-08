import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { LANGUAGE_STORAGE_KEY } from './i18n';
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve } from '../test/solveFixtures';
import { completeTimerSolve } from '../test/completeTimerSolve';

vi.mock('../features/cube', () => ({
  CubeVisualization: () => <div role="img" />,
}));
beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'));
afterEach(() => localStorage.clear());
async function prepare() {
  const fixture = timerApplicationFixture([
    makeSolve({ id: 'old', rawTimeMs: 9000 }),
  ]);
  render(<App {...fixture} />);
  await screen.findByTestId('scramble');
  await act(() => completeTimerSolve(fixture.application));
  return fixture;
}
function pointerClick(element: HTMLElement) {
  fireEvent.pointerDown(element);
  fireEvent.click(element, { detail: 1 });
}
function cancel(dialog: HTMLElement) {
  fireEvent(dialog, new Event('cancel', { cancelable: true, bubbles: false }));
}
function hold(fixture: ReturnType<typeof timerApplicationFixture>) {
  fireEvent.keyDown(document.activeElement!, { key: ' ', code: 'Space' });
  expect(fixture.application.getState().timer.status).toBe('holding');
  fireEvent.keyUp(document.activeElement!, { key: ' ', code: 'Space' });
}

it('restores history and statistics on a new application without selecting a current result', async () => {
  const fixture = timerApplicationFixture();
  await fixture.application.initialize();
  await completeTimerSolve(fixture.application, 12483);
  const restored = timerApplicationFixture([...fixture.records.values()]);
  render(<App {...restored} />);
  await screen.findByTestId('recent-solve');
  expect(screen.getByRole('timer')).toHaveTextContent('0.000');
  expect(screen.getByTestId('stat-best')).toHaveTextContent('12.483');
  expect(screen.getByTestId('stat-mean')).toHaveTextContent('12.483');
  expect(screen.queryByRole('region', { name: 'Solve actions' })).toBeNull();
});

it.each(['save', 'cancel', 'escape'] as const)(
  'note dialog supports %s and returns pointer focus to timing',
  async (action) => {
    const fixture = await prepare();
    await act(() => fixture.application.updateNote('solve-1', 'existing note'));
    pointerClick(screen.getByRole('button', { name: 'Note' }));
    const dialog = screen.getByRole('dialog', { name: 'Note for solve' });
    const input = within(dialog).getByRole('textbox');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('existing note');
    expect(input).toHaveAttribute('maxLength', '300');
    fireEvent.change(input, { target: { value: 'new note with spaces' } });
    fireEvent.keyDown(input, { key: ' ', code: 'Space' });
    fireEvent.keyUp(input, { key: ' ', code: 'Space' });
    expect(fixture.application.getState().timer.status).toBe('idle');
    expect(within(dialog).getByText('Characters used: 20 / 300')).toBeVisible();
    if (action === 'escape') cancel(dialog);
    else
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: action === 'save' ? 'Save note' : 'Cancel',
        }),
      );
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(fixture.records.get('solve-1')?.note).toBe(
      action === 'save' ? 'new note with spaces' : 'existing note',
    );
    expect(screen.getByRole('main')).toHaveFocus();
    hold(fixture);
  },
);

it('delete confirmation cancels safely and clears only the current solve', async () => {
  const fixture = await prepare();
  for (const action of ['cancel', 'escape', 'delete']) {
    pointerClick(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();
    expect(dialog).toHaveTextContent('10.000');
    if (action === 'escape') cancel(dialog);
    else
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: action === 'delete' ? 'Confirm delete' : 'Cancel',
        }),
      );
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(screen.getByRole('main')).toHaveFocus();
    if (action !== 'delete') expect(fixture.records.size).toBe(2);
  }
  expect(screen.getByRole('timer')).toHaveTextContent('0.000');
  expect(screen.getByTestId('recent-solve')).toHaveTextContent('9.000');
  hold(fixture);
});

it.each(['ru', 'en'] as const)(
  'shows localized local date/time in historical details (%s)',
  async (language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    const solve = makeSolve({ createdAt: '2026-10-07T18:42:00.000Z' });
    render(<App {...timerApplicationFixture([solve])} />);
    const row = await screen.findByTestId('recent-solve');
    pointerClick(within(row).getByRole('button'));
    const time = screen.getByRole('dialog').querySelector('time')!;
    expect(time).toHaveAttribute('datetime', solve.createdAt);
    expect(time).toHaveTextContent(
      new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(solve.createdAt)),
    );
  },
);

it('history pointer close returns to timer; keyboard close returns to result button', async () => {
  const fixture = await prepare();
  const opener = within(screen.getAllByTestId('recent-solve')[1]!).getByRole(
    'button',
  );
  pointerClick(opener);
  cancel(screen.getByRole('dialog'));
  expect(screen.getByRole('main')).toHaveFocus();
  hold(fixture);
  act(() => opener.focus());
  fireEvent.keyDown(opener, { key: 'Enter', code: 'Enter' });
  fireEvent.click(opener, { detail: 0 });
  cancel(screen.getByRole('dialog'));
  expect(opener).toHaveFocus();
  fireEvent.keyDown(opener, { key: ' ', code: 'Space' });
  expect(fixture.application.getState().timer.status).toBe('idle');
});
