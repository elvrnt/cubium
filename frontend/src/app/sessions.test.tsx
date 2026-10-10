import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { App } from './App';
import { createAppRoutes } from './router';
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve } from '../test/solveFixtures';
vi.mock('../features/cube', () => ({ CubeVisualization: () => <div /> }));
beforeEach(() => localStorage.setItem('cubium.language', 'en'));
afterEach(() => localStorage.clear());
async function prepare(path = '/') {
  const fixture = timerApplicationFixture([makeSolve()]);
  const router = createMemoryRouter(createAppRoutes(fixture), {
    initialEntries: [path],
  });
  const view = render(<App {...fixture} router={router} />);
  await screen.findByRole('combobox', { name: 'Session' });
  return { ...fixture, ...view, router };
}
async function create(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  const dialog = screen.getByRole('dialog', { name: 'Manage sessions' });
  for (const name of ['Close', 'Create session']) {
    const button = within(dialog).getByRole('button', { name });
    expect(button.textContent).toBe('');
    expect(button).toHaveAttribute('title', name);
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  }
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Create session' }),
  );
  fireEvent.change(
    within(dialog).getByRole('textbox', { name: 'Session name' }),
    { target: { value: name } },
  );
  expect(
    within(dialog).getByRole('button', { name: 'Save session' }).textContent,
  ).toBe('');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save session' }));
  await waitFor(() => expect(within(dialog).queryByRole('textbox')).toBeNull());
  return dialog;
}
it('creates and switches a shared session, resets Results filters and retains the Timer scramble', async () => {
  const f = await prepare();
  await screen.findByText('R U2');
  const scramble = f.application.getState().currentScramble;
  const dialog = await create('  Practice  ');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(f.application.getState().solves).toHaveLength(0);
  expect(f.application.getState().currentScramble).toBe(scramble);
  await act(() =>
    f.router.navigate('/results?limit=all&ao5=0&ao12=1&from=2026-01-01'),
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Session' }), {
    target: { value: 'test-main-session' },
  });
  await waitFor(() => expect(f.router.state.location.search).toBe(''));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Range' })).toHaveValue('100'),
  );
  expect(screen.getByRole('checkbox', { name: 'ao5' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'ao12' })).not.toBeChecked();
});
it('retains an invalid or failed name draft and Retry completes the same session creation', async () => {
  const f = await prepare('/results');
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  const dialog = screen.getByRole('dialog', { name: 'Manage sessions' });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Create session' }),
  );
  const input = within(dialog).getByRole('textbox');
  fireEvent.change(input, { target: { value: ' '.repeat(4) } });
  expect(
    within(dialog).getByRole('button', { name: 'Save session' }),
  ).toBeDisabled();
  fireEvent.change(input, { target: { value: 'Retry name' } });
  f.repository.mutateSession.mockRejectedValueOnce(new Error('write'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save session' }));
  await within(dialog).findByRole('button', { name: 'Retry save' });
  expect(input).toHaveValue('Retry name');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Retry save' }));
  await waitFor(() => expect(within(dialog).queryByRole('textbox')).toBeNull());
  expect(f.application.getState().sessions).toHaveLength(2);
});

it('resets a filtered Results URL when creation switches the session inside the protected manager', async () => {
  const f = await prepare('/results?limit=all&ao12=1&from=2026-01-01');
  const dialog = await create('Filtered session');
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Range' })).toHaveValue('100'),
  );
  expect(f.router.state.location.search).toBe('');
  expect(dialog).toBeInTheDocument();
});
it('disables session controls during a historical editor and protects the last active session', async () => {
  await prepare();
  fireEvent.click(screen.getByRole('button', { name: 'Manage sessions' }));
  const dialog = screen.getByRole('dialog', { name: 'Manage sessions' });
  expect(
    within(dialog).getByRole('button', { name: 'Archive' }),
  ).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Recent solves' })).getByRole(
      'button',
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: 'Session', hidden: true }),
    ).toBeDisabled(),
  );
});
