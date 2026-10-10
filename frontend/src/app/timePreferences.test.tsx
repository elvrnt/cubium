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
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve } from '../test/solveFixtures';

vi.mock('../features/cube', () => ({ CubeVisualization: () => <div /> }));
beforeEach(() => localStorage.setItem('cubium.language', 'en'));
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

async function prepare() {
  const fixture = timerApplicationFixture([makeSolve({ rawTimeMs: 12345 })]);
  const view = render(<App {...fixture} />);
  await screen.findByText('R U2');
  return { ...fixture, ...view };
}

it('offers independent choices, updates all result displays and retains raw solves after reload', async () => {
  const fixture = await prepare();
  const original = [...fixture.records.values()][0];
  const button = screen.getByRole('button', { name: 'Timer settings' });
  fireEvent.pointerDown(button);
  fireEvent.click(button);
  const dialog = within(screen.getByRole('dialog', { name: 'Timer settings' }));
  const running = dialog.getByRole('combobox', { name: 'While running' });
  const results = dialog.getByRole('combobox', { name: 'Results' });
  expect(within(running).getAllByRole('option')).toHaveLength(4);
  expect(within(results).getAllByRole('option')).toHaveLength(2);
  expect(running).toHaveValue('2');
  expect(results).toHaveValue('3');
  fireEvent.change(running, { target: { value: '1' } });
  fireEvent.change(results, { target: { value: '2' } });
  fireEvent.keyDown(window, { code: 'Space', key: ' ' });
  expect(fixture.application.getState().timer.status).toBe('idle');
  fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getByRole('timer')).toHaveTextContent(/^0\.00$/);
  expect(screen.getByTestId('recent-solve')).toHaveTextContent('12.34');
  expect(screen.getByTestId('stat-best')).toHaveTextContent('12.34');
  expect([...fixture.records.values()][0]).toEqual(original);
  expect(fixture.repository.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link', { name: 'Results' }));
  await screen.findByRole('heading', { name: 'Results' });
  const open = screen.getByRole('button', { name: /Open solve/ });
  expect(open).toHaveAccessibleName(/12\.34$/);
  fireEvent.click(open);
  expect(
    screen.getByRole('dialog', { name: 'Solve details' }),
  ).toHaveTextContent('12.34');
  fixture.unmount();
  const next = await prepare();
  fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
  expect(screen.getByRole('combobox', { name: 'While running' })).toHaveValue(
    '1',
  );
  expect(screen.getByRole('combobox', { name: 'Results' })).toHaveValue('2');
  next.unmount();
});

it.each(['invalid JSON', '{"runningDecimals":9,"resultDecimals":1}', 'null'])(
  'falls back safely for malformed preferences %s',
  async (stored) => {
    localStorage.setItem('cubium.time-display', stored);
    await prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
    expect(screen.getByRole('combobox', { name: 'While running' })).toHaveValue(
      '2',
    );
    expect(screen.getByRole('combobox', { name: 'Results' })).toHaveValue('3');
  },
);

it('retains keyboard focus and supports changing display when local storage fails', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('unavailable');
  });
  const fixture = await prepare();
  const button = screen.getByRole('button', { name: 'Timer settings' });
  button.focus();
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.click(button);
  fireEvent.change(screen.getByRole('combobox', { name: 'Results' }), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(button).toHaveFocus());
  expect(screen.getByRole('timer')).toHaveTextContent(/^0\.00$/);
  await act(() =>
    fixture.application.setPenalty([...fixture.records.keys()][0]!, 'PLUS_TWO'),
  );
  expect(screen.getByTestId('recent-solve')).toHaveTextContent('14.34+');
});
