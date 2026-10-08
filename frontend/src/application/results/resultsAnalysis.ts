import {
  compareSolvesChronologically,
  getEffectiveTimeMs,
} from '../../domain/solves';
import type { Solve } from '../../domain/solves';
import {
  calculateAo5,
  calculateAo12,
  calculateStatistics,
} from '../../domain/statistics';
import type { AverageResult } from '../../domain/statistics';

export const RESULTS_PAGE_SIZE = 50;
export type ResultsLimit = '100' | '500' | 'all';
export interface ResultsFilters {
  limit: ResultsLimit;
  from: string;
  to: string;
}
export interface ResultsPoint {
  solve: Readonly<Solve>;
  ordinal: number;
  timeMs: number | null;
  ao5: AverageResult;
  ao12: AverageResult;
}
export const DEFAULT_RESULTS_FILTERS: ResultsFilters = {
  limit: '100',
  from: '',
  to: '',
};

/** Validate the calendar day, then construct local midnight (including DST). */
function localDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function validResultsDates(filters: ResultsFilters): boolean {
  const from = filters.from ? localDay(filters.from) : null;
  const to = filters.to ? localDay(filters.to) : null;
  return (
    !(filters.from && !from) &&
    !(filters.to && !to) &&
    !(from && to && from > to)
  );
}

export function readResultsFilters(params: URLSearchParams): ResultsFilters {
  const limit = params.get('limit');
  return {
    limit: limit === '500' || limit === 'all' ? limit : '100',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
}

export function analyzeResults(
  solves: readonly Readonly<Solve>[],
  filters: ResultsFilters,
) {
  const valid = validResultsDates(filters);
  const from = filters.from ? localDay(filters.from)?.getTime() : undefined;
  const lastDay = filters.to ? localDay(filters.to) : null;
  // The next calendar midnight, rather than +24h, handles short/long DST days.
  if (lastDay) lastDay.setDate(lastDay.getDate() + 1);
  const until = lastDay?.getTime();
  const ordered = [...solves].sort(compareSolvesChronologically);
  const inDates = valid
    ? ordered
        .map((solve, index) => ({ solve, ordinal: index + 1 }))
        .filter(({ solve }) => {
          const timestamp = new Date(solve.createdAt).getTime();
          return (
            (from === undefined || timestamp >= from) &&
            (until === undefined || timestamp < until)
          );
        })
    : [];
  const selected =
    filters.limit === 'all' ? inDates : inDates.slice(-Number(filters.limit));
  const records = selected.map((item) => item.solve);
  const points: ResultsPoint[] = selected.map((item, index) => ({
    ...item,
    timeMs: getEffectiveTimeMs(item.solve),
    // Only bounded windows are sorted by domain averages: no quadratic prefixes.
    ao5: calculateAo5(records.slice(Math.max(0, index - 4), index + 1)),
    ao12: calculateAo12(records.slice(Math.max(0, index - 11), index + 1)),
  }));
  return {
    valid,
    points,
    statistics: calculateStatistics(records),
    matchingDates: inDates.length,
  };
}

/** A null point breaks a segment, never substitutes zero for a DNF. */
export function chartPath(
  points: readonly ResultsPoint[],
  value: (point: ResultsPoint) => number | null,
  x: (index: number) => number,
  y: (timeMs: number) => number,
): string {
  let penDown = false;
  return points
    .map((point, index) => {
      const time = value(point);
      if (time === null) {
        penDown = false;
        return '';
      }
      const command = penDown ? 'L' : 'M';
      penDown = true;
      // A tiny stroked segment keeps a lone valid point visible between gaps.
      return `${command}${x(index).toFixed(2)},${y(time).toFixed(2)}${command === 'M' ? 'h0.01' : ''}`;
    })
    .join(' ');
}
