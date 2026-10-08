import { useEffect, useRef, useState } from 'react';
import type { TimerApplication } from '../../application/timer';
import type { TimerClock } from '../../domain/timer';
import { formatSolveTime } from '../../domain/solves';
import { CubeVisualization } from '../cube';
import {
  attachTimerKeyboard,
  ignoresTimerShortcut,
} from './keyboardController';
import { useTimerApplication } from './useTimerApplication';
import { TimerDisplay } from './TimerDisplay';
import { StatisticsPanel } from './StatisticsPanel';
import { ResultActions } from './ResultActions';
import { Dialog } from './Dialog';
import { SolveAnnouncement } from './SolveAnnouncement';
import { useLanguage } from '../../app/i18n';
import { useTimerPresentation } from './useTimerPresentation';
import { useInteractionFocus } from './useInteractionFocus';
import { SolveDetails } from './SolveDetails';
import { SiteHeader } from '../../app/SiteHeader';
import { usePageNavigationGuard } from '../../app/usePageNavigationGuard';
import './timer.css';

export function TimerPage({
  application,
  clock,
}: {
  application: TimerApplication;
  clock: TimerClock;
}) {
  const state = useTimerApplication(application);
  const running = state.timer.status === 'running';
  const { pageRef, headerRef, scrambleRef, centerRef } = useTimerPresentation(
    state.history.status === 'ready',
    running,
  );
  const chrome = { inert: running, 'aria-hidden': running || undefined };
  const { t } = useLanguage();
  const timerFocusRef = useRef<HTMLElement>(null);
  const historyFocus = useInteractionFocus(timerFocusRef);
  const [cubeOpen, setCubeOpen] = useState(false);
  const [statisticsHelpOpen, setStatisticsHelpOpen] = useState(false);
  const [controlFocused, setControlFocused] = useState(false);
  const closeStatisticsHelp = () => {
    setStatisticsHelpOpen(false);
    timerFocusRef.current?.focus({ preventScroll: true });
  };
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
  usePageNavigationGuard(running || editing || cubeOpen || !!selected);
  const [actionError, setActionError] = useState<unknown>(null);
  useEffect(() => {
    if (editing || cubeOpen || selected || statisticsHelpOpen) return;
    return attachTimerKeyboard(application, clock, setActionError);
  }, [application, clock, editing, cubeOpen, selected, statisticsHelpOpen]);
  const displayed = state.solves.find(
    (solve) => solve.id === state.displayedSolveId,
  );
  const busy =
    state.persistence.status !== 'idle' ||
    !['idle', 'stopped'].includes(state.timer.status);
  return (
    <div
      ref={pageRef}
      className="timer-page"
      data-running={running}
      onFocusCapture={(event) =>
        setControlFocused(ignoresTimerShortcut(event.target))
      }
      onBlurCapture={(event) =>
        setControlFocused(ignoresTimerShortcut(event.relatedTarget))
      }
      onKeyDown={(event) => {
        if (event.key === 'Escape' && statisticsHelpOpen) {
          event.preventDefault();
          closeStatisticsHelp();
        }
      }}
    >
      <SolveAnnouncement application={application} />
      <SiteHeader
        neutralRef={timerFocusRef}
        headerRef={headerRef}
        running={running}
      />
      <main ref={timerFocusRef} tabIndex={-1}>
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
            <div className="timer-stage">
              <section
                ref={scrambleRef}
                className="scramble-region timer-chrome"
                {...chrome}
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
                <section
                  ref={centerRef}
                  className="timer-center"
                  aria-label={t('Timer')}
                  tabIndex={0}
                  onClick={(event) => {
                    if (!ignoresTimerShortcut(event.target)) {
                      setStatisticsHelpOpen(false);
                      event.currentTarget.focus({ preventScroll: true });
                    }
                  }}
                >
                  <TimerDisplay
                    application={application}
                    state={state}
                    controlFocused={controlFocused}
                    running={running}
                  />
                  <div className="timer-chrome" {...chrome}>
                    {displayed && (
                      <ResultActions
                        key={displayed.id}
                        application={application}
                        solve={displayed}
                        persistence={state.persistence}
                        disabled={busy}
                        onEditingChange={setEditing}
                        onError={setActionError}
                        timerFocusRef={timerFocusRef}
                      />
                    )}
                  </div>
                </section>
                <aside
                  className="timer-cube timer-chrome"
                  {...chrome}
                  aria-label={t('Scrambled cube')}
                >
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
                      <span>
                        {t('Enlarge cube')}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M6 18 18 6M6 6h12v12" />
                        </svg>
                      </span>
                    </button>
                  ) : (
                    <div className="cube-placeholder">
                      {t('Waiting for scramble')}
                    </div>
                  )}
                  <p>{t('State after the scramble')}</p>
                </aside>
              </div>
            </div>
            <div className="timer-chrome" {...chrome}>
              <StatisticsPanel
                statistics={state.statistics}
                helpOpen={statisticsHelpOpen}
                disabled={busy}
                onHelpOpen={() => setStatisticsHelpOpen(true)}
                onHelpClose={closeStatisticsHelp}
              />
            </div>
            <div className="timer-notices timer-chrome" {...chrome}>
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
            <section
              className="recent-solves timer-chrome"
              {...chrome}
              aria-label={t('Recent solves')}
            >
              <div className="recent-solves__heading">
                <h2>{t('Last 20')}</h2>
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
                          onPointerDown={historyFocus.onPointerDown}
                          onKeyDown={historyFocus.onKeyDown}
                          onClick={(event) => {
                            historyFocus.capture(event);
                            setSelectedId(solve.id);
                          }}
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
      <footer className="site-footer timer-chrome" {...chrome}>
        <span>
          {controlFocused && ['idle', 'stopped'].includes(state.timer.status)
            ? t('Click the timer or use Tab to return')
            : t('Hold Space · release to start · any key to stop')}
        </span>
        <span>{t('Local-first speedcubing')}</span>
      </footer>
      {cubeOpen && state.currentScramble && (
        <Dialog
          title={t('Cube after current scramble')}
          returnFocusRef={timerFocusRef}
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
        <SolveDetails
          application={application}
          solve={selected}
          persistence={state.persistence}
          disabled={busy}
          onClose={() => setSelectedId(null)}
          onError={setActionError}
          neutralRef={timerFocusRef}
          returnFocusRef={historyFocus.returnFocusRef}
        />
      )}
    </div>
  );
}
