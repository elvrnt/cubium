import type { RefObject } from 'react';
import type { Solve } from '../../domain/solves';
import { formatSolveTime, formatTimeMs } from '../../domain/solves';
import type { AverageResult } from '../../domain/statistics';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { useLanguage } from '../../app/i18n';
import { Dialog } from './Dialog';
import { ResultActions, PersistenceRetry } from './ResultActions';
import { SolveCreatedAt } from './SolveCreatedAt';

export function SolveDetails({
  application,
  solve,
  persistence,
  disabled,
  onClose,
  onError,
  neutralRef,
  returnFocusRef,
  onEditingChange = ignoreEditingChange,
  averages,
}: {
  application: TimerApplication;
  solve: Readonly<Solve>;
  persistence: TimerApplicationState['persistence'];
  disabled: boolean;
  onClose: () => void;
  onError: (error: unknown) => void;
  neutralRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
  onEditingChange?: (editing: boolean) => void;
  averages?: { ao5: AverageResult; ao12: AverageResult };
}) {
  const { t } = useLanguage();
  return (
    <Dialog
      title={t('Solve details')}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={neutralRef}
    >
      <p>
        {t('Result')} <strong>{formatSolveTime(solve)}</strong>
      </p>
      <SolveCreatedAt createdAt={solve.createdAt} />
      {averages && (
        <dl
          className="solve-detail-averages"
          aria-label={t('Statistics for selected solves')}
        >
          {(['ao5', 'ao12'] as const).map((key) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd className="measurement">
                {averages[key].status === 'OK'
                  ? formatTimeMs(averages[key].timeMs)
                  : averages[key].status === 'DNF'
                    ? 'DNF'
                    : '—'}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p>
        {t('Penalty')}:{' '}
        {solve.penalty === 'NONE'
          ? t('None')
          : solve.penalty === 'PLUS_TWO'
            ? '+2'
            : 'DNF'}
      </p>
      <h3>{t('Historical scramble')}</h3>
      <p className="scramble-notation" data-testid="historical-scramble">
        {solve.scramble}
      </p>
      <ResultActions
        key={solve.id}
        application={application}
        solve={solve}
        persistence={persistence}
        disabled={disabled}
        onEditingChange={onEditingChange}
        onDeleted={onClose}
        onError={onError}
        timerFocusRef={neutralRef}
      />
      {persistence.status === 'error' && (
        <div role="alert">
          <p>
            {t(
              'Could not save your change. It is still held in memory. Retry before closing this page.',
            )}
          </p>
          <PersistenceRetry application={application} />
        </div>
      )}
    </Dialog>
  );
}
const ignoreEditingChange = () => {};
