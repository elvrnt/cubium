import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { LANGUAGE_STORAGE_KEY } from './i18n';
import { timerApplicationFixture } from '../test/timerApplicationFixture';
import { makeSolve } from '../test/solveFixtures';

vi.mock('../features/cube', () => ({
  CubeVisualization: ({ scramble }: { scramble: string }) => (
    <div role="img" aria-label={scramble} />
  ),
}));
// jsdom has no native modal implementation; real focus/Escape is tested in Chromium.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

it('defaults to Russian, brands Cubium and switches both ways without changing notation', async () => {
  const fixture = timerApplicationFixture();
  const view = render(<App {...fixture} />);
  await screen.findByText('R U2');
  expect(screen.getByRole('link', { name: 'Cubium — главная' })).toBeVisible();
  expect(screen.queryByText('CubeTrainer')).not.toBeInTheDocument();
  expect(screen.getByText('Статистика')).toBeVisible();
  fireEvent.change(screen.getByRole('combobox', { name: 'Язык' }), {
    target: { value: 'en' },
  });
  expect(screen.getByText('Statistics')).toBeVisible();
  expect(screen.getByTestId('scramble')).toHaveTextContent('R U2');
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  view.unmount();
  render(<App {...fixture} />);
  expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ru' } });
  expect(screen.getByText('Статистика')).toBeVisible();
  expect(document.documentElement.lang).toBe('ru');
});

it('enlarges exactly the current cube and closes through cancel and button', async () => {
  render(<App {...timerApplicationFixture()} />);
  await screen.findByText('R U2');
  const open = screen.getByRole('button', { name: 'Увеличить куб' });
  fireEvent.click(open);
  const dialog = screen.getByRole('dialog', {
    name: 'Куб после текущего скрамбла',
  });
  expect(within(dialog).getByRole('img')).toHaveAccessibleName('R U2');
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(open);
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('edits historical notes and penalties independently, then deletes older and displayed results', async () => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  const a = makeSolve({ id: 'a', rawTimeMs: 13000, scramble: "F U' L2" });
  const b = makeSolve({ id: 'b', rawTimeMs: 12500 });
  const fixture = timerApplicationFixture([a, b]);
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  expect(screen.getByRole('timer')).toHaveTextContent('12.500');
  const older = within(screen.getAllByTestId('recent-solve')[1]!).getByRole(
    'button',
  );
  fireEvent.click(older);
  expect(older).toHaveAttribute('aria-pressed', 'true');
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByTestId('historical-scramble').textContent).toBe(
    a.scramble,
  );
  fireEvent.click(dialog.getByRole('button', { name: '+2' }));
  await waitFor(() =>
    expect(fixture.records.get('a')?.penalty).toBe('PLUS_TWO'),
  );
  expect(screen.getByRole('timer')).toHaveTextContent('12.500');
  fireEvent.click(dialog.getByRole('button', { name: 'Note' }));
  const input = dialog.getByRole('textbox');
  expect(input).toHaveAttribute('maxlength', '300');
  fireEvent.change(input, { target: { value: 'x'.repeat(301) } });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(dialog.getByRole('button', { name: 'Save note' })).toBeDisabled();
  fireEvent.change(input, { target: { value: 'x'.repeat(300) } });
  expect(dialog.getByText('Characters used: 300 / 300')).toBeVisible();
  fireEvent.click(dialog.getByRole('button', { name: 'Save note' }));
  await waitFor(() => expect(fixture.records.get('a')?.note).toHaveLength(300));
  expect(screen.getByTestId('scramble')).toHaveTextContent('R U2');
  fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm delete' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('timer')).toHaveTextContent('12.500');
  await act(() => fixture.application.setPenalty('b', 'PLUS_TWO'));
  expect(screen.getByRole('timer')).toHaveTextContent('14.500+');
  await act(() => fixture.application.setPenalty('b', 'DNF'));
  expect(screen.getByRole('timer')).toHaveTextContent('DNF');
  await act(() => fixture.application.deleteSolve('b'));
  expect(screen.getByRole('timer')).toHaveTextContent('0.000');
});

it('deleting B leaves A in history but never shows A as the central result', async () => {
  const fixture = timerApplicationFixture([
    makeSolve({ id: 'a', rawTimeMs: 13000 }),
    makeSolve({ id: 'b', rawTimeMs: 12500 }),
  ]);
  render(<App {...fixture} />);
  await screen.findByText('R U2');
  await act(() => fixture.application.deleteSolve('b'));
  expect(screen.getByTestId('recent-solve')).toHaveTextContent('13.000');
  expect(screen.getByRole('timer')).toHaveTextContent('0.000');
  expect(
    screen.queryByRole('button', { name: 'Заметка' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Результат')).not.toBeInTheDocument();
  expect(
    screen.queryByText('Начните первую сборку, удерживая пробел.'),
  ).not.toBeInTheDocument();
});
