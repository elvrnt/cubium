import { TwistyPlayer } from 'cubing/twisty';
import { useEffect, useRef } from 'react';
import './CubeVisualization.css';

export interface CubeVisualizationProps {
  scramble: string;
}

/** Static final pattern. Generation and scramble ownership belong to the caller. */
export function CubeVisualization({ scramble }: CubeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const player = new TwistyPlayer({
      puzzle: '3x3x3',
      visualization: '2D',
      // Setup applies the whole scramble before the empty playback algorithm.
      // Keep this documented experimental API isolated here.
      experimentalSetupAlg: scramble,
      experimentalSetupAnchor: 'start',
      alg: '',
      controlPanel: 'none',
      viewerLink: 'none',
      background: 'none',
      experimentalDragInput: 'none',
      experimentalMovePressInput: 'none',
    });
    player.inert = true;
    player.setAttribute('aria-hidden', 'true');
    container.appendChild(player);

    return () => player.remove();
  }, [scramble]);

  return (
    <div
      className="cube-visualization"
      ref={containerRef}
      role="img"
      aria-label={`3×3 cube after scramble: ${scramble}`}
    />
  );
}
