import { useEffect, useState } from 'react';
import type { Scramble } from '../domain/scramble';
import { CubeVisualization } from '../features/cube';
import { cubingScrambleGenerator } from '../infrastructure/cubing';
import './scramblePreview.css';

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; scramble: Scramble }
  | { status: 'error' };

export function ScramblePreview() {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    cubingScrambleGenerator.generate333().then(
      (scramble) => {
        if (active) setState({ status: 'ready', scramble });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [request]);

  return (
    <main className="app scramble-preview">
      <p className="eyebrow">Development preview</p>
      <h1>3×3 scramble</h1>
      {state.status === 'loading' && <p role="status">Generating scramble…</p>}
      {state.status === 'error' && (
        <p role="alert">Could not generate a scramble. Try again.</p>
      )}
      {state.status === 'ready' && (
        <>
          <p className="scramble-preview__notation">
            {state.scramble.notation}
          </p>
          <div className="scramble-preview__cube">
            <CubeVisualization scramble={state.scramble.notation} />
          </div>
        </>
      )}
      <button
        type="button"
        disabled={state.status === 'loading'}
        onClick={() => {
          setState({ status: 'loading' });
          setRequest((value) => value + 1);
        }}
      >
        {state.status === 'error'
          ? 'Retry generation'
          : 'Generate next scramble'}
      </button>
    </main>
  );
}
