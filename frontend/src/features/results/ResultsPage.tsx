import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { TimerApplication } from '../../application/timer';
import {
  analyzeResults,
  readResultsFilters,
  RESULTS_PAGE_SIZE,
} from '../../application/results/resultsAnalysis';
import type { ResultsPoint } from '../../application/results/resultsAnalysis';
import { formatSolveTime } from '../../domain/solves';
import { useLanguage } from '../../app/i18n';
import { SiteHeader } from '../../app/SiteHeader';
import { usePageNavigationGuard } from '../../app/usePageNavigationGuard';
import { StatisticsPanel } from '../timer/StatisticsPanel';
import { SolveDetails } from '../timer/SolveDetails';
import { PersistenceRetry } from '../timer/ResultActions';
import { useInteractionFocus } from '../timer/useInteractionFocus';
import { SolveChart } from './SolveChart';
import '../timer/timer.css';
import './results.css';
import { SessionControls } from '../sessions/SessionControls';
import { DatabaseBlockedError } from '../../infrastructure/persistence';

export function ResultsPage({
  application,
}: {
  application: TimerApplication;
}) {
  const state = useSyncExternalStore(
    application.subscribe,
    application.getState,
  );
  const { t, language } = useLanguage();
  const neutralRef = useRef<HTMLElement>(null);
  const focus = useInteractionFocus(neutralRef);
  const [params, setParams] = useSearchParams();
  const filters = readResultsFilters(params);
  const { limit, from, to } = filters;
  const analysis = useMemo(
    () => analyzeResults(state.solves, { limit, from, to }),
    [state.solves, limit, from, to],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.solves.find((solve) => solve.id === selectedId);
  const selectedPoint = analysis.points.find(
    (point) => point.solve.id === selectedId,
  );
  const [editing, setEditing] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  usePageNavigationGuard(
    editing || !!selected || sessionsOpen,
    sessionsOpen && !editing && !selected,
  );
  useEffect(() => {
    application.setEditingBlocked(editing || !!selected);
    return () => application.setEditingBlocked(false);
  }, [application, editing, selected]);
  const previousSession = useRef(state.activeSessionId);
  useEffect(() => {
    if (
      previousSession.current !== null &&
      previousSession.current !== state.activeSessionId
    ) {
      setParams(new URLSearchParams(), { replace: true });
      setSelectedId(null);
    }
    previousSession.current = state.activeSessionId;
  }, [state.activeSessionId, setParams]);
  useEffect(() => {
    void application.loadHistory();
  }, [application]);
  // Drop deleted identities before a subsequent selection can reuse stale focus.
  useEffect(
    () =>
      application.subscribe(() =>
        setSelectedId((id) =>
          application.getState().solves.some((solve) => solve.id === id)
            ? id
            : null,
        ),
      ),
    [application],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(analysis.points.length / RESULTS_PAGE_SIZE),
  );
  const requested = Number(params.get('page') ?? '1');
  const page = Number.isSafeInteger(requested)
    ? Math.max(1, Math.min(pageCount, requested))
    : 1;
  const journal = analysis.points
    .slice()
    .reverse()
    .slice((page - 1) * RESULTS_PAGE_SIZE, page * RESULTS_PAGE_SIZE);
  const busy =
    state.persistence.status !== 'idle' ||
    !['idle', 'stopped'].includes(state.timer.status);
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const open = (point: ResultsPoint, event: MouseEvent<HTMLElement>) => {
    focus.capture(event);
    setSelectedId(point.solve.id);
  };
  const dates = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return (
    <div className="timer-page results-page">
      <SiteHeader neutralRef={neutralRef} />
      <SessionControls
        application={application}
        state={state}
        neutralRef={neutralRef}
        disabled={busy || editing || !!selected}
        onOpenChange={setSessionsOpen}
      />
      <main ref={neutralRef} tabIndex={-1}>
        <div className="results-title">
          <h1>{t('Results')}</h1>
          {state.history.status === 'ready' && (
            <p>
              {t('Showing')}{' '}
              <span className="measurement">{analysis.points.length}</span>{' '}
              {t('of')}{' '}
              <span className="measurement">{state.solves.length}</span>
            </p>
          )}
        </div>
        {state.history.status !== 'ready' ? (
          <section className="startup">
            {state.history.status === 'error' ? (
              <div role="alert">
                {state.history.error instanceof DatabaseBlockedError && (
                  <p>
                    {t(
                      'Close another Cubium tab to finish updating the database.',
                    )}
                  </p>
                )}
                <h2>{t('Could not load solve history')}</h2>
                <p>
                  {t(
                    'Your saved history could not be opened. Retry to continue.',
                  )}
                </p>
                <button
                  onClick={() => {
                    void application.loadHistory();
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
            <div
              className="results-filters"
              role="group"
              aria-label={t('Range')}
            >
              <label>
                {t('Range')}
                <select
                  value={filters.limit}
                  onChange={(event) => change('limit', event.target.value)}
                >
                  <option value="100">{t('Last 100')}</option>
                  <option value="500">{t('Last 500')}</option>
                  <option value="all">{t('All solves')}</option>
                </select>
              </label>
              <label>
                {t('From')}
                <input
                  type="date"
                  value={filters.from}
                  aria-invalid={!analysis.valid}
                  aria-describedby={
                    !analysis.valid ? 'results-date-error' : undefined
                  }
                  onChange={(event) => change('from', event.target.value)}
                />
              </label>
              <label>
                {t('To')}
                <input
                  type="date"
                  value={filters.to}
                  aria-invalid={!analysis.valid}
                  aria-describedby={
                    !analysis.valid ? 'results-date-error' : undefined
                  }
                  onChange={(event) => change('to', event.target.value)}
                />
              </label>
              <button onClick={() => setParams({})}>{t('Reset')}</button>
            </div>
            {!analysis.valid && (
              <p
                id="results-date-error"
                role="alert"
                className="results-date-error"
              >
                {t('Choose valid dates; the start must not be after the end.')}
              </p>
            )}
            <StatisticsPanel statistics={analysis.statistics} selectedRange />
            {state.persistence.status === 'saving' && (
              <p role="status">{t('Saving on this device…')}</p>
            )}
            {state.persistence.status === 'error' &&
              state.persistence.pending.type !== 'session' && (
                <div role="alert" className="error-notice">
                  <p>
                    {t(
                      'Could not save your change. It is still held in memory. Retry before closing this page.',
                    )}
                  </p>
                  <PersistenceRetry application={application} />
                </div>
              )}
            {actionError !== null && (
              <div role="alert" className="error-notice">
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
            {!state.solves.length ? (
              <section className="results-empty">
                <h2>{t('No solves yet. Take your time.')}</h2>
                <Link to="/">{t('Go to Timer')}</Link>
              </section>
            ) : !analysis.points.length ? (
              <section className="results-empty">
                <h2>{t('No solves match these filters.')}</h2>
                <button onClick={() => setParams({})}>{t('Reset')}</button>
              </section>
            ) : (
              <>
                <SolveChart
                  points={analysis.points}
                  ao5={params.get('ao5') !== 'off'}
                  ao12={params.get('ao12') === 'on'}
                  onToggle={(series) =>
                    change(
                      series,
                      series === 'ao5'
                        ? params.get('ao5') === 'off'
                          ? ''
                          : 'off'
                        : params.get('ao12') === 'on'
                          ? ''
                          : 'on',
                    )
                  }
                  onOpen={open}
                  disabled={busy}
                />
                <section
                  className="results-journal"
                  aria-label={t('Solve journal')}
                >
                  <div className="results-section-heading">
                    <h2>{t('Solve journal')}</h2>
                    <span>{t('newest first')}</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col" className="journal-number">
                          №
                        </th>
                        <th scope="col">{t('Time')}</th>
                        <th scope="col">{t('Created at')}</th>
                        <th scope="col" className="journal-note">
                          {t('Note')}
                        </th>
                        <th scope="col">
                          <span className="sr-only">{t('Details')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {journal.map((point) => (
                        <tr key={point.solve.id} data-testid="journal-solve">
                          <td className="journal-number measurement">
                            {point.ordinal}
                          </td>
                          <td className="journal-time measurement">
                            {formatSolveTime(point.solve)}
                          </td>
                          <td className="journal-date">
                            <time dateTime={point.solve.createdAt}>
                              {dates.format(new Date(point.solve.createdAt))}
                            </time>
                          </td>
                          <td className="journal-note">
                            <span>{point.solve.note || '—'}</span>
                          </td>
                          <td className="journal-action">
                            <button
                              disabled={busy}
                              onPointerDown={focus.onPointerDown}
                              onKeyDown={focus.onKeyDown}
                              onClick={(event) => open(point, event)}
                              aria-label={`${t('Open solve')} ${point.ordinal}: ${formatSolveTime(point.solve)}`}
                            >
                              {t('Details')}
                              {point.solve.note && (
                                <span
                                  className="note-indicator"
                                  aria-label={t('Has note')}
                                >
                                  •
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <nav
                    className="journal-pagination"
                    aria-label={t('Journal pages')}
                  >
                    <button
                      disabled={page <= 1}
                      onClick={() => change('page', String(page - 1))}
                    >
                      {t('Previous')}
                    </button>
                    <span>
                      {t('Page')}{' '}
                      <span className="measurement">
                        {page} / {pageCount}
                      </span>
                    </span>
                    <button
                      disabled={page >= pageCount}
                      onClick={() => change('page', String(page + 1))}
                    >
                      {t('Next')}
                    </button>
                  </nav>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>{t('Local-first speedcubing')}</span>
        <span>{t('Saved on this device')}</span>
      </footer>
      {selected && (
        <SolveDetails
          application={application}
          solve={selected}
          persistence={state.persistence}
          disabled={busy}
          onClose={() => setSelectedId(null)}
          onError={setActionError}
          neutralRef={neutralRef}
          returnFocusRef={focus.returnFocusRef}
          onEditingChange={setEditing}
          averages={
            selectedPoint
              ? { ao5: selectedPoint.ao5, ao12: selectedPoint.ao12 }
              : undefined
          }
        />
      )}
    </div>
  );
}
