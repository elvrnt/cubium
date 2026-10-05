import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the project foundation page without a backend', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'CubeTrainer', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The project foundation is ready/)).toBeVisible();
  });
});
