import { TwistyPlayer } from 'cubing/twisty';
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomScrambleForEvent } from 'cubing/scramble';
import { CubeVisualization } from './index';

vi.mock('cubing/twisty', () => ({
  TwistyPlayer: vi.fn(function () {
    return document.createElement('twisty-player');
  }),
}));
vi.mock('cubing/scramble', () => ({ randomScrambleForEvent: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe('CubeVisualization', () => {
  it('renders an accessible static 2D 3x3 final setup with no player controls', () => {
    render(<CubeVisualization scramble="R U2" />);
    const visualization = screen.getByRole('img', {
      name: '3×3 cube after scramble: R U2',
    });
    expect(visualization.querySelector('twisty-player')).not.toBeNull();
    expect(TwistyPlayer).toHaveBeenCalledExactlyOnceWith({
      puzzle: '3x3x3',
      visualization: '2D',
      experimentalSetupAlg: 'R U2',
      experimentalSetupAnchor: 'start',
      alg: '',
      controlPanel: 'none',
      viewerLink: 'none',
      background: 'none',
      experimentalDragInput: 'none',
      experimentalMovePressInput: 'none',
    });
    const player = visualization.querySelector('twisty-player');
    expect(player?.inert).toBe(true);
    expect(player).toHaveAttribute('aria-hidden', 'true');
    expect(randomScrambleForEvent).not.toHaveBeenCalled();
  });

  it('replaces the visualization input when the supplied scramble changes', () => {
    const { rerender, container } = render(<CubeVisualization scramble="R" />);
    const previous = container.querySelector('twisty-player');
    rerender(<CubeVisualization scramble="U2 F'" />);
    expect(TwistyPlayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ experimentalSetupAlg: "U2 F'", alg: '' }),
    );
    expect(previous?.isConnected).toBe(false);
    expect(container.querySelectorAll('twisty-player')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      "3×3 cube after scramble: U2 F'",
    );
    expect(randomScrambleForEvent).not.toHaveBeenCalled();
  });

  it('does not recreate the player for an unchanged scramble', () => {
    const { rerender } = render(<CubeVisualization scramble="R" />);
    rerender(<CubeVisualization scramble="R" />);
    expect(TwistyPlayer).toHaveBeenCalledTimes(1);
  });

  it('cleans up player instances on StrictMode remount and unmount', () => {
    const { container, unmount } = render(
      <StrictMode>
        <CubeVisualization scramble="F2" />
      </StrictMode>,
    );
    expect(container.querySelectorAll('twisty-player')).toHaveLength(1);
    const player = container.querySelector('twisty-player');
    unmount();
    expect(player?.isConnected).toBe(false);
  });
});
