import { StrictMode } from 'react';
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
import { makeSolve } from '../test/solveFixtures';

vi.mock('../features/cube', () => ({
  CubeVisualization: ({ scramble }: { scramble: string }) => (
    <div role="img" aria-label={scramble} />
  ),
}));
beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en'));
afterEach(() => localStorage.clear());

async function start(
  fixture: ReturnType<typeof timerApplicationFixture>,
  origin = 0,
) {
  await act(async () => {
    await fixture.application.dispatchTimerEvent({
      type: 'START_KEY_DOWN',
      now: origin,
    });
    await fixture.application.dispatchTimerEvent({
      type: 'HOLD_THRESHOLD_REACHED',
      now: origin + 300,
      holdStartedAt: origin,
    });
    await fixture.application.dispatchTimerEvent({
      type: 'START_KEY_UP',
      now: origin + 400,
    });
  });
}
async function stop(
  fixture: ReturnType<typeof timerApplicationFixture>,
  now = 1641,
) {
  await act(async () => {
    await fixture.application.dispatchTimerEvent({
      type: 'STOP_KEY_DOWN',
      now,
    });
    await fixture.application.dispatchTimerEvent({
      type: 'STOP_KEY_UP',
      now: now + 1,
    });
  });
}

it('announces completion exactly once across batched stop/release, duplicate stops and persistence retry', async () => {
  const fixture = timerApplicationFixture([makeSolve({ id: 'old' })]);
  fixture.repository.save.mockRejectedValueOnce(new Error('disk'));
  render(
    <StrictMode>
      <App {...fixture} />
    </StrictMode>,
  );
  await screen.findByText('R U2');
  const live = screen.getByTestId('solve-announcement');
  expect(live).toBeEmptyDOMElement();
  const messages: string[] = [];
  const observer = new MutationObserver(() => messages.push(live.textContent!));
  observer.observe(live, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  try {
    await start(fixture);
    expect(live).toBeEmptyDOMElement();
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    await stop(fixture);
    expect(live).toHaveTextContent('Solve completed: 1.241');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    await act(async () => {
      await fixture.application.dispatchTimerEvent({
        type: 'STOP_KEY_DOWN',
        now: 1643,
      });
      await fixture.application.retryPersistence();
    });
    expect(
      messages.filter((message) => message.startsWith('Solve completed:')),
    ).toEqual(['Solve completed: 1.241']);
    await start(fixture, 2000);
    expect(live).toBeEmptyDOMElement();
    await stop(fixture, 3641);
    expect(
      messages.filter((message) => message.startsWith('Solve completed:')),
    ).toEqual(['Solve completed: 1.241', 'Solve completed: 1.241']);
  } finally {
    observer.disconnect();
  }
});

it('formats +2 and DNF corrections without reporting another completion or announcing older edits', async () => {
  const fixture = timerApplicationFixture([
    makeSolve({ id: 'old', rawTimeMs: 9000 }),
  ]);
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  await start(fixture);
  await stop(fixture);
  const live = screen.getByTestId('solve-announcement');
  expect(live).toHaveTextContent('Solve completed: 1.241');
  await act(() => fixture.application.setPenalty('solve-1', 'PLUS_TWO'));
  expect(live).toHaveTextContent('Result updated: 3.241+');
  expect(screen.getByRole('timer')).toHaveTextContent('3.241+');
  await act(() => fixture.application.setPenalty('solve-1', 'DNF'));
  expect(live).toHaveTextContent('Result updated: DNF');
  await act(() => fixture.application.setPenalty('old', 'PLUS_TWO'));
  await act(() => fixture.application.updateNote('solve-1', 'a note'));
  expect(live).toHaveTextContent('Result updated: DNF');
});

it('never announces restored history or its penalty edits as a new solve', async () => {
  const fixture = timerApplicationFixture([makeSolve({ id: 'old' })]);
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  await act(() => fixture.application.setPenalty('old', 'DNF'));
  expect(screen.getByTestId('solve-announcement')).toBeEmptyDOMElement();
});

it.each(['en', 'ru'] as const)(
  'localizes completion, focus hints, history and statistics help in %s',
  async (language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    const fixture = timerApplicationFixture();
    render(<App {...fixture} />);
    await screen.findByText('R U2');
    await start(fixture);
    await stop(fixture);
    expect(screen.getByTestId('solve-announcement')).toHaveTextContent(
      language === 'ru' ? 'Сборка завершена: 1.241' : 'Solve completed: 1.241',
    );
    expect(
      screen.getByRole('heading', {
        name: language === 'ru' ? 'Последние 20' : 'Last 20',
      }),
    ).toBeVisible();
    act(() => screen.getByRole('combobox').focus());
    expect(screen.getByRole('timer').parentElement).toHaveTextContent(
      language === 'ru' ? 'Вернитесь к таймеру' : 'Click the timer',
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: language === 'ru' ? 'О статистике' : 'About statistics',
      }),
    );
    const help = screen.getByRole('region', {
      name: language === 'ru' ? 'О статистике' : 'About statistics',
    });
    expect(help).toHaveFocus();
    expect(help).toHaveTextContent(
      language === 'ru' ? 'без DNF' : 'excluding DNF',
    );
    expect(help).toHaveTextContent(
      language === 'ru'
        ? 'минимум 5, 12, 50 и 100'
        : 'at least 5, 12, 50 and 100',
    );
    expect(help).toHaveTextContent(
      language === 'ru' ? 'среднее тоже DNF' : 'the average is DNF',
    );
    fireEvent.keyDown(help, { key: 'Escape', code: 'Escape' });
    expect(help).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { code: 'Space', key: ' ' });
    expect(fixture.application.getState().timer.status).toBe('holding');
    fireEvent.keyUp(document.activeElement!, { code: 'Space', key: ' ' });
  },
);

it('changes the hint on button focus and returns to timing on readout click without stealing button focus', async () => {
  const fixture = timerApplicationFixture([makeSolve({ id: 'old' })]);
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  const plus = screen.getByRole('button', { name: '+2' });
  act(() => plus.focus());
  expect(screen.getByRole('timer').parentElement).toHaveTextContent(
    'Click the timer',
  );
  fireEvent.keyDown(plus, { code: 'Space', key: ' ' });
  fireEvent.keyUp(plus, { code: 'Space', key: ' ' });
  expect(fixture.application.getState().timer.status).toBe('idle');
  fireEvent.click(plus);
  await waitFor(() => expect(plus).toHaveAttribute('aria-pressed', 'true'));
  expect(plus).toHaveFocus();
  fireEvent.click(screen.getByRole('timer'));
  expect(screen.getByRole('region', { name: 'Timer' })).toHaveFocus();
  expect(screen.getByRole('timer').parentElement).toHaveTextContent(
    'Idle · Hold Space',
  );
  fireEvent.keyDown(document.activeElement!, { code: 'Space', key: ' ' });
  expect(fixture.application.getState().timer.status).toBe('holding');
  fireEvent.keyUp(document.activeElement!, { code: 'Space', key: ' ' });
});

it('keeps statistics help unavailable during timing', async () => {
  const fixture = timerApplicationFixture();
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  const trigger = screen.getByRole('button', { name: 'About statistics' });
  await start(fixture);
  expect(trigger).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'About statistics' })).toBeNull();
});
