import { useEffect, useState } from 'react';
import type { TimerApplication } from '../../application/timer';
import type { TimerClock } from '../../domain/timer';
import { formatSolveTime } from '../../domain/solves';
import { CubeVisualization } from '../cube';
import { attachTimerKeyboard } from './keyboardController';
import { useTimerApplication } from './useTimerApplication';
import { TimerDisplay } from './TimerDisplay';
import { StatisticsPanel } from './StatisticsPanel';
import { ResultActions } from './ResultActions';
import './timer.css';

export function TimerPage({
  application,
  clock,
}: {
  application: TimerApplication;
  clock: TimerClock;
}) {
  const state = useTimerApplication(application);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  useEffect(() => {
    if (editing) return;
    return attachTimerKeyboard(application, clock, setActionError);
  }, [application, clock, editing]);
  const latest = state.solves.at(-1);
  const busy =
    state.persistence.status !== 'idle' ||
    !['idle', 'stopped'].includes(state.timer.status);
  return (
    <div className="timer-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="CubeTrainer home">
          <span className="brand__mark" aria-hidden="true">
            ▦
          </span>
          CubeTrainer
        </a>
        <nav aria-label="Main navigation">
          <a href="/" aria-current="page">
            Timer
          </a>
        </nav>
        <span className="site-header__local">
          3×3 <span aria-hidden="true">·</span> Saved on this device
        </span>
      </header>
      <main>
        <h1 className="sr-only">3×3 Timer</h1>
        {state.history.status !== 'ready' ? (
          <section className="startup" aria-label="Startup">
            {state.history.status === 'error' ? (
              <div role="alert">
                <h2>Could not load solve history</h2>
                <p>
                  Your saved history could not be opened. Retry to continue.
                </p>
                <button
                  onClick={() => {
                    void application.initialize();
                  }}
                >
                  Retry history
                </button>
              </div>
            ) : (
              <p role="status">Loading solve history…</p>
            )}
          </section>
        ) : (
          <>
            <section className="scramble-region" aria-label="Current scramble">
              <p className="section-label">3×3 scramble</p>
              {state.currentScramble && (
                <p className="scramble-notation" data-testid="scramble">
                  {state.currentScramble.notation}
                </p>
              )}
              {state.scramble.status === 'loading' && (
                <p role="status">Generating scramble…</p>
              )}
              {state.scramble.status === 'error' && (
                <div role="alert">
                  <p>
                    Could not generate a scramble. Your saved solves are safe.
                  </p>
                  <button
                    onClick={() => {
                      void application.retryScramble();
                    }}
                  >
                    Retry scramble
                  </button>
                </div>
              )}
            </section>
            <div className="timer-workspace">
              <StatisticsPanel statistics={state.statistics} />
              <section className="timer-center" aria-label="Timer" tabIndex={0}>
                <TimerDisplay application={application} state={state} />
                {latest ? (
                  <ResultActions
                    key={latest.id}
                    application={application}
                    solve={latest}
                    persistence={state.persistence}
                    disabled={busy}
                    onEditingChange={setEditing}
                    onError={setActionError}
                  />
                ) : (
                  <p className="timer-empty-hint">
                    Your first solve starts with <kbd>Space</kbd>.
                  </p>
                )}
              </section>
              <aside className="timer-cube" aria-label="Scrambled cube">
                {state.currentScramble ? (
                  <CubeVisualization
                    scramble={state.currentScramble.notation}
                  />
                ) : (
                  <div className="cube-placeholder">Waiting for scramble</div>
                )}
                <p>State after the scramble</p>
              </aside>
            </div>
            <div className="timer-notices">
              {state.persistence.status === 'saving' && (
                <p role="status">Saving on this device…</p>
              )}
              {state.persistence.status === 'error' && (
                <div className="error-notice" role="alert">
                  <p>
                    Could not save your change. It is still held in memory.
                    Retry before closing this page.
                  </p>
                  <button
                    onClick={() => {
                      void application.retryPersistence();
                    }}
                  >
                    Retry save
                  </button>
                </div>
              )}
              {actionError !== null && (
                <div className="error-notice" role="alert">
                  <p>
                    The action could not be completed. Please try again when the
                    timer is idle.
                  </p>
                  <button onClick={() => setActionError(null)}>Dismiss</button>
                </div>
              )}
            </div>
            <section className="recent-solves" aria-label="Recent solves">
              <div className="recent-solves__heading">
                <h2>Recent</h2>
                <span>
                  {state.solves.length}{' '}
                  {state.solves.length === 1 ? 'solve' : 'solves'}{' '}
                  <span aria-hidden="true">·</span> newest first
                </span>
              </div>
              {state.solves.length ? (
                <ol>
                  {state.solves
                    .slice(-20)
                    .reverse()
                    .map((solve) => (
                      <li key={solve.id} data-testid="recent-solve">
                        <span>{formatSolveTime(solve)}</span>
                        {solve.note && (
                          <span
                            className="note-indicator"
                            title={solve.note}
                            aria-label="Has note"
                          >
                            •
                          </span>
                        )}
                      </li>
                    ))}
                </ol>
              ) : (
                <p>No solves yet. Take your time.</p>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>
          Hold <kbd>Space</kbd> · release to start · press to stop
        </span>
        <span>Local-first speedcubing</span>
      </footer>
    </div>
  );
}
