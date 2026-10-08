import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { createAppRoutes } from './router';
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve, makeSolves } from '../test/solveFixtures';
import type { Solve } from '../domain/solves';
import { LANGUAGE_STORAGE_KEY } from './i18n';

vi.mock('../features/cube', () => ({
  CubeVisualization: () => <div role="img" aria-label="Cube" />,
}));
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'));
afterEach(() => {
  routers.forEach((router) => router.dispose());
  routers.length = 0;
  localStorage.clear();
});
function setup(solves: Solve[] = [], entry = '/results', renderNow = true) {
  const f = timerApplicationFixture(solves);
  const router = createMemoryRouter(createAppRoutes(f), {
    initialEntries: [entry],
  });
  routers.push(router);
  const mount = () => render(<App {...f} router={router} />);
  if (renderNow) mount();
  return { ...f, router, mount };
}

it('loads directly without scramble generation, defaults to 100 and pages only the journal', async () => {
  const f = setup(makeSolves(Array(150).fill(12000)));
  await screen.findByRole('region', { name: 'Solve chart' });
  expect(f.generator.generate333).not.toHaveBeenCalled();
  expect(screen.getAllByTestId('journal-solve')).toHaveLength(50);
  expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 100 of 150');
  expect(screen.getByTestId('chart-ao5')).toBeInTheDocument();
  expect(screen.queryByTestId('chart-ao12')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(f.router.state.location.search).toContain('page=2'),
  );
  expect(screen.getByText(/Page/)).toHaveTextContent('2 / 2');
  expect(screen.getByText(/Showing/)).toHaveTextContent('100 of 150');
});
it('uses URL filters, reports invalid dates and restores the previous range on Back', async () => {
  const f = setup(makeSolves(Array(120).fill(12000)), '/results?limit=all');
  await screen.findByRole('region', { name: 'Solve chart' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Range' }), {
    target: { value: '100' },
  });
  await waitFor(() =>
    expect(f.router.state.location.search).toContain('limit=100'),
  );
  await act(() => f.router.navigate(-1));
  expect(screen.getByText(/Showing/)).toHaveTextContent('120 of 120');
  fireEvent.change(screen.getByLabelText('From'), {
    target: { value: '2026-10-06' },
  });
  fireEvent.change(screen.getByLabelText('To'), {
    target: { value: '2026-10-05' },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Choose valid dates',
  );
  expect(
    screen.queryByRole('region', { name: 'Solve chart' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Reset' })[0]!);
  expect(
    await screen.findByRole('region', { name: 'Solve chart' }),
  ).toBeVisible();
});
it('shows a Timer action for empty history', async () => {
  setup([], '/results');
  expect(
    await screen.findByRole('link', { name: 'Go to Timer' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('region', { name: 'Solve chart' }),
  ).not.toBeInTheDocument();
});
it('distinguishes a filtered empty range and Reset restores the chart', async () => {
  setup(makeSolves([1000]), '/results?from=2099-01-01');
  expect(
    await screen.findByText('No solves match these filters.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Go to Timer' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Reset' })[0]!);
  expect(
    await screen.findByRole('region', { name: 'Solve chart' }),
  ).toBeVisible();
});
it('shows the separate DNF band and no numeric mean', async () => {
  setup(makeSolves(Array(12).fill(null)));
  expect(
    await screen.findByText(
      'No numeric times in this range. DNF solves are shown in the separate band.',
    ),
  ).toBeVisible();
  expect(screen.getByTestId('chart-dnf').getAttribute('d')).toContain('M');
  expect(screen.getByTestId('stat-mean')).toHaveTextContent('—');
});
it('reports and retries a history failure without generating a scramble', async () => {
  const f = setup([makeSolve()], '/results', false);
  f.repository.getAll.mockRejectedValueOnce(new Error('history'));
  f.mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Retry history' }));
  expect(
    await screen.findByRole('region', { name: 'Solve chart' }),
  ).toBeVisible();
  expect(f.repository.getAll).toHaveBeenCalledTimes(2);
  expect(f.generator.generate333).not.toHaveBeenCalled();
});
it('supports keyboard chart selection and retains native focus after the details close', async () => {
  setup(makeSolves([10000, 11000, 12000]));
  const chart = await screen.findByRole('region', { name: 'Solve chart' });
  chart.focus();
  fireEvent.keyDown(chart, { key: 'Home' });
  expect(screen.getByRole('status')).toHaveTextContent('10.000');
  fireEvent.keyDown(chart, { key: 'ArrowRight' });
  expect(screen.getByRole('status')).toHaveTextContent('11.000');
  fireEvent.keyDown(chart, { key: 'End' });
  fireEvent.keyDown(chart, { key: 'Enter' });
  const details = await screen.findByRole('dialog', { name: 'Solve details' });
  expect(details).toHaveTextContent('12.000');
  fireEvent.click(within(details).getByRole('button', { name: 'Close' }));
  expect(chart).toHaveFocus();
});
it('shares penalty edits with Timer and retries failed durable writes', async () => {
  const f = setup(makeSolves([10000]));
  fireEvent.click(await screen.findByRole('button', { name: /Open solve 1:/ }));
  f.repository.update.mockRejectedValueOnce(new Error('write'));
  fireEvent.click(screen.getByRole('button', { name: '+2' }));
  await waitFor(() =>
    expect(f.application.getState().persistence.status).toBe('error'),
  );
  expect(screen.getByTestId('stat-best')).toHaveTextContent('10.000');
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Solve details' })).getByRole(
      'button',
      { name: 'Retry save' },
    ),
  );
  await waitFor(() =>
    expect(screen.getByTestId('stat-best')).toHaveTextContent('12.000'),
  );
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
  );
  fireEvent.click(screen.getByRole('link', { name: 'Timer' }));
  expect(await screen.findByText('R U2')).toBeVisible();
  expect(screen.getByTestId('stat-best')).toHaveTextContent('12.000');
  expect(f.repository.getAll).toHaveBeenCalledTimes(1);
  expect(f.generator.generate333).toHaveBeenCalledTimes(1);
});
it('saves exact notes and deletes the last solve on a journal page', async () => {
  setup(makeSolves(Array(51).fill(10000)), '/results?limit=all&page=2');
  fireEvent.click(await screen.findByRole('button', { name: /Open solve 1:/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Note' }));
  const editor = await screen.findByRole('dialog', { name: 'Note for solve' });
  fireEvent.change(within(editor).getByRole('textbox'), {
    target: { value: '  precise note\n' },
  });
  fireEvent.click(within(editor).getByRole('button', { name: 'Save note' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Note for solve' }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole('dialog', { name: 'Solve details' }),
  ).toHaveTextContent('precise note');
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(screen.getByText(/Page/)).toHaveTextContent('1 / 1');
  expect(screen.getAllByTestId('journal-solve')).toHaveLength(50);
});
it('blocks leaving an editor and restores navigation after Cancel', async () => {
  const f = setup(makeSolves([10000]));
  fireEvent.click(await screen.findByRole('button', { name: /Open solve/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Note' }));
  await act(() => f.router.navigate('/'));
  expect(f.router.state.location.pathname).toBe('/results');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
  );
  await act(() => f.router.navigate('/'));
  expect(await screen.findByRole('timer')).toBeVisible();
});
it('ignores timer shortcuts on Results and cancels hold when leaving Timer', async () => {
  const f = setup([], '/');
  await screen.findByText('R U2');
  await act(() =>
    f.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 }),
  );
  await act(() => f.router.navigate('/results'));
  expect(f.application.getState().timer.status).toBe('idle');
  fireEvent.keyDown(window, { code: 'Space', key: ' ' });
  fireEvent.keyUp(window, { code: 'Space', key: ' ' });
  expect(f.application.getState().timer.status).toBe('idle');
});
it('blocks navigation while running and allows it immediately after stop', async () => {
  const f = setup([], '/');
  await screen.findByText('R U2');
  await act(async () => {
    await f.application.dispatchTimerEvent({ type: 'START_KEY_DOWN', now: 0 });
    await f.application.dispatchTimerEvent({
      type: 'HOLD_THRESHOLD_REACHED',
      now: 300,
      holdStartedAt: 0,
    });
    await f.application.dispatchTimerEvent({ type: 'START_KEY_UP', now: 400 });
  });
  await act(() => f.router.navigate('/results'));
  expect(f.router.state.location.pathname).toBe('/');
  await act(() =>
    f.application.dispatchTimerEvent({ type: 'STOP_KEY_DOWN', now: 1400 }),
  );
  await act(() => f.router.navigate('/results'));
  expect(f.router.state.location.pathname).toBe('/results');
  expect(
    await screen.findByRole('button', { name: /Open solve/ }),
  ).toBeVisible();
});
