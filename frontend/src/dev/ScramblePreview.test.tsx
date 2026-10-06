import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Scramble } from '../domain/scramble';
import { cubingScrambleGenerator } from '../infrastructure/cubing';
import { ScramblePreview } from './ScramblePreview';

vi.mock('../infrastructure/cubing', () => ({
  cubingScrambleGenerator: { generate333: vi.fn() },
}));
vi.mock('../features/cube', () => ({
  CubeVisualization: ({ scramble }: { scramble: string }) => (
    <div role="img" aria-label={scramble} />
  ),
}));
const generate = vi.mocked(cubingScrambleGenerator.generate333);
beforeEach(() => {
  generate.mockReset();
});

it('shows loading then the same notation for text and visualization', async () => {
  generate.mockResolvedValue({ event: '333', notation: 'R U2' });
  render(<ScramblePreview />);
  expect(screen.getByRole('status')).toHaveTextContent('Generating');
  expect(screen.getByRole('button')).toBeDisabled();
  expect(await screen.findByText('R U2')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName('R U2');
});

it('updates text and visualization together after explicit generation', async () => {
  generate.mockResolvedValueOnce({ event: '333', notation: 'R' });
  let resolveNext!: (value: Scramble) => void;
  generate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveNext = resolve;
      }),
  );
  render(<ScramblePreview />);
  await screen.findByText('R');
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('status')).toBeVisible();
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await act(async () => resolveNext({ event: '333', notation: 'F2' }));
  expect(screen.getByText('F2')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName('F2');
  expect(generate).toHaveBeenCalledTimes(2);
});

it('shows an error and retries only on request', async () => {
  generate
    .mockRejectedValueOnce(new Error('generation failed'))
    .mockResolvedValueOnce({ event: '333', notation: 'U' });
  render(<ScramblePreview />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not generate',
  );
  expect(generate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Retry generation' }));
  expect(await screen.findByText('U')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
