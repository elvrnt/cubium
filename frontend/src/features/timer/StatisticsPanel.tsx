import { useTimePreferences } from '../../app/TimePreferences';
import { IconButton } from '../shared/IconButton';
import { useEffect, useId, useRef } from 'react';
import type { StatisticsSummary } from '../../application/timer';
import type { AverageResult } from '../../domain/statistics';
import { useLanguage } from '../../app/i18n';

export function StatisticsPanel({
  statistics,
  helpOpen = false,
  onHelpOpen,
  onHelpClose,
  disabled = false,
  selectedRange = false,
}: {
  statistics: StatisticsSummary;
  helpOpen?: boolean;
  onHelpOpen?: () => void;
  onHelpClose?: () => void;
  disabled?: boolean;
  selectedRange?: boolean;
}) {
  const { t } = useLanguage();
  const { formatTimeMs } = useTimePreferences();
  const helpId = useId();
  const helpTitleId = useId();
  const helpRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (helpOpen) helpRef.current?.focus({ preventScroll: true });
  }, [helpOpen]);
  const time = (value: number | null) =>
    value === null ? '—' : formatTimeMs(value);
  const average = (value: Readonly<AverageResult>) =>
    value.status === 'OK'
      ? formatTimeMs(value.timeMs)
      : value.status === 'DNF'
        ? 'DNF'
        : '—';
  const values = [
    ['best', time(statistics.best)],
    ['mean', time(statistics.mean)],
    ['ao5', average(statistics.ao5)],
    ['ao12', average(statistics.ao12)],
    ['ao50', average(statistics.ao50)],
    ['ao100', average(statistics.ao100)],
  ] as const;
  return (
    <aside
      className="timer-statistics"
      aria-label={t(
        selectedRange ? 'Statistics for selected solves' : 'Statistics',
      )}
    >
      <div className="timer-statistics__heading">
        <h2>
          {t(selectedRange ? 'Statistics for selected solves' : 'Statistics')}
        </h2>
        {onHelpOpen && (
          <button
            type="button"
            className="statistics-help-trigger"
            disabled={disabled}
            aria-label={t('About statistics')}
            aria-expanded={helpOpen}
            aria-controls={helpId}
            onClick={helpOpen ? onHelpClose : onHelpOpen}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v6M12 7v1" />
            </svg>
          </button>
        )}
      </div>
      {helpOpen && (
        <div
          ref={helpRef}
          id={helpId}
          className="statistics-help"
          role="region"
          tabIndex={-1}
          aria-labelledby={helpTitleId}
          data-timer-shortcuts="off"
        >
          <h3 id={helpTitleId}>{t('About statistics')}</h3>
          <p>
            {t(
              'Mean is the average of all completed times, including +2 and excluding DNF.',
            )}
          </p>
          <p>
            {t(
              'aoN is the average of the last N solves: ao5, ao12, ao50 and ao100 require at least 5, 12, 50 and 100 results respectively.',
            )}
          </p>
          <p>
            {t(
              '— means there is not enough data yet. Averages exclude the best and worst results; if a DNF remains, the average is DNF.',
            )}
          </p>
          <IconButton
            type="button"
            onClick={onHelpClose}
            icon="close"
            label={t('Close')}
          />
        </div>
      )}
      <dl>
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd data-testid={`stat-${label}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
