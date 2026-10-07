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
import { Dialog } from './Dialog';
import { useLanguage } from '../../app/i18n';
import './timer.css';

export function TimerPage({
  application,
  clock,
}: {
  application: TimerApplication;
  clock: TimerClock;
}) {
  const state = useTimerApplication(application);
  const { t, language, setLanguage } = useLanguage();
  const [cubeOpen, setCubeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.solves.find((solve) => solve.id === selectedId);
  useEffect(
    () =>
      application.subscribe(() => {
        setSelectedId((id) =>
          application.getState().solves.some((solve) => solve.id === id)
            ? id
            : null,
        );
      }),
    [application],
  );
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  useEffect(() => {
    if (editing || cubeOpen || selected) return;
    return attachTimerKeyboard(application, clock, setActionError);
  }, [application, clock, editing, cubeOpen, selected]);
  const displayed = state.solves.find(
    (solve) => solve.id === state.displayedSolveId,
  );
  const busy =
    state.persistence.status !== 'idle' ||
    !['idle', 'stopped'].includes(state.timer.status);
  return (
    <div className="timer-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label={t('Cubium home')}>
          <span className="brand__mark" aria-hidden="true">
            ▦
          </span>
          Cubium
        </a>
        <nav aria-label={t('Main navigation')}>
          <a href="/" aria-current="page">
            {t('Timer')}
          </a>
        </nav>
        <span className="site-header__local">
          3×3 <span aria-hidden="true">·</span> {t('Saved on this device')}
        </span>
        <label className="language-selector">
          <span className="sr-only">{t('Language')}</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value === 'en' ? 'en' : 'ru')
            }
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
      </header>
      <main>
        <h1 className="sr-only">{t('3×3 Timer')}</h1>
        {state.history.status !== 'ready' ? (
          <section className="startup" aria-label={t('Startup')}>
            {state.history.status === 'error' ? (
              <div role="alert">
                <h2>{t('Could not load solve history')}</h2>
                <p>
                  {t(
                    'Your saved history could not be opened. Retry to continue.',
                  )}
                </p>
                <button
                  onClick={() => {
                    void application.initialize();
                  }}
                >
                  {t('Retry history')}
                </button>
              </div>
            ) : (
              <p role="status">{t('Loading solve history…')}</p>
            )}
          </section>
        ) : (
          <>
            <section
              className="scramble-region"
              aria-label={t('Current scramble')}
            >
              <p className="section-label">{t('3×3 scramble')}</p>
              {state.currentScramble && (
                <p className="scramble-notation" data-testid="scramble">
                  {state.currentScramble.notation}
                </p>
              )}
              {state.scramble.status === 'loading' && (
                <p role="status">{t('Generating scramble…')}</p>
              )}
              {state.scramble.status === 'error' && (
                <div role="alert">
                  <p>
                    {t(
                      'Could not generate a scramble. Your saved solves are safe.',
                    )}
                  </p>
                  <button
                    onClick={() => {
                      void application.retryScramble();
                    }}
                  >
                    {t('Retry scramble')}
                  </button>
                </div>
              )}
            </section>
            <div className="timer-workspace">
              <StatisticsPanel statistics={state.statistics} />
              <section
                className="timer-center"
                aria-label={t('Timer')}
                tabIndex={0}
              >
                <TimerDisplay application={application} state={state} />
                {displayed && (
                  <ResultActions
                    key={displayed.id}
                    application={application}
                    solve={displayed}
                    persistence={state.persistence}
                    disabled={busy}
                    onEditingChange={setEditing}
                    onError={setActionError}
                  />
                )}
              </section>
              <aside className="timer-cube" aria-label={t('Scrambled cube')}>
                {state.currentScramble ? (
                  <button
                    className="cube-open"
                    aria-label={t('Enlarge cube')}
                    disabled={busy}
                    onClick={() => setCubeOpen(true)}
                  >
                    <CubeVisualization
                      scramble={state.currentScramble.notation}
                      label={`${t('3×3 cube after scramble')}: ${state.currentScramble.notation}`}
                    />
                    <span>{t('Enlarge cube')} ↗</span>
                  </button>
                ) : (
                  <div className="cube-placeholder">
                    {t('Waiting for scramble')}
                  </div>
                )}
                <p>{t('State after the scramble')}</p>
              </aside>
            </div>
            <div className="timer-notices">
              {state.persistence.status === 'saving' && (
                <p role="status">{t('Saving on this device…')}</p>
              )}
              {state.persistence.status === 'error' && (
                <div className="error-notice" role="alert">
                  <p>
                    {t(
                      'Could not save your change. It is still held in memory. Retry before closing this page.',
                    )}
                  </p>
                  <button
                    onClick={() => {
                      void application.retryPersistence();
                    }}
                  >
                    {t('Retry save')}
                  </button>
                </div>
              )}
              {actionError !== null && (
                <div className="error-notice" role="alert">
                  <p>
                    {t(
                      'The action could not be completed. Please try again when the timer is idle.',
                    )}
                  </p>
                  <button onClick={() => setActionError(null)}>
                    {t('Dismiss')}
                  </button>
                </div>
              )}
            </div>
            <section className="recent-solves" aria-label={t('Recent solves')}>
              <div className="recent-solves__heading">
                <h2>{t('Recent')}</h2>
                <span>
                  {t('Total solves')}: {state.solves.length} ·{' '}
                  {t('newest first')}
                </span>
              </div>
              {state.solves.length ? (
                <ol>
                  {state.solves
                    .slice(-20)
                    .reverse()
                    .map((solve) => (
                      <li key={solve.id} data-testid="recent-solve">
                        <button
                          disabled={busy}
                          aria-pressed={selectedId === solve.id}
                          onClick={() => setSelectedId(solve.id)}
                        >
                          <span>{formatSolveTime(solve)}</span>
                          {solve.note && (
                            <span
                              className="note-indicator"
                              title={solve.note}
                              aria-label={t('Has note')}
                            >
                              •
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ol>
              ) : (
                <p>{t('No solves yet. Take your time.')}</p>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>{t('Hold Space · release to start · any key to stop')}</span>
        <span>{t('Local-first speedcubing')}</span>
      </footer>
      {cubeOpen && state.currentScramble && (
        <Dialog
          title={t('Cube after current scramble')}
          closeOnBackdrop
          onClose={() => setCubeOpen(false)}
        >
          <CubeVisualization
            scramble={state.currentScramble.notation}
            label={`${t('3×3 cube after scramble')}: ${state.currentScramble.notation}`}
          />
          <p className="scramble-notation">{state.currentScramble.notation}</p>
        </Dialog>
      )}
      {selected && (
        <Dialog title={t('Solve details')} onClose={() => setSelectedId(null)}>
          <p>
            {t('Penalty')}:{' '}
            {selected.penalty === 'NONE'
              ? t('None')
              : selected.penalty === 'PLUS_TWO'
                ? '+2'
                : 'DNF'}
          </p>
          <h3>{t('Historical scramble')}</h3>
          <p className="scramble-notation" data-testid="historical-scramble">
            {selected.scramble}
          </p>
          <ResultActions
            key={selected.id}
            application={application}
            solve={selected}
            persistence={state.persistence}
            disabled={busy}
            onEditingChange={ignoreEditingChange}
            onDeleted={() => setSelectedId(null)}
            onError={setActionError}
          />
          {state.persistence.status === 'error' && (
            <div role="alert">
              <p>
                {t(
                  'Could not save your change. It is still held in memory. Retry before closing this page.',
                )}
              </p>
              <button
                onClick={() => {
                  void application.retryPersistence();
                }}
              >
                {t('Retry save')}
              </button>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

const ignoreEditingChange = () => {};
