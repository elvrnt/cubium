import type { StatisticsSummary } from '../../application/timer';
import type { AverageResult } from '../../domain/statistics';
import { formatTimeMs } from '../../domain/solves';

export function StatisticsPanel({
  statistics,
}: {
  statistics: StatisticsSummary;
}) {
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
    ['ao100', average(statistics.ao100)],
  ];
  return (
    <aside className="timer-statistics" aria-label="Statistics">
      <h2>Statistics</h2>
      <dl>
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-testid={`stat-${label}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
