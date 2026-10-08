// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  analyzeResults,
  chartPath,
  DEFAULT_RESULTS_FILTERS,
  readResultsFilters,
  validResultsDates,
} from './resultsAnalysis';
import { makeSolve, makeSolves } from '../../test/solveFixtures';

describe('results selection', () => {
  it.each(['2026-03-08', '2026-11-01'])(
    'uses the actual next midnight across DST on %s',
    (day) => {
      vi.stubEnv('TZ', 'America/New_York');
      try {
        const [year, month, date] = day.split('-').map(Number);
        const from = new Date(year!, month! - 1, date!);
        const until = new Date(year!, month! - 1, date! + 1);
        const rows = [
          from.getTime() - 1,
          from.getTime(),
          until.getTime() - 1,
          until.getTime(),
        ].map((time, i) =>
          makeSolve({ id: String(i), createdAt: new Date(time).toISOString() }),
        );
        expect(
          analyzeResults(rows, { limit: 'all', from: day, to: day }).points.map(
            (point) => point.solve.id,
          ),
        ).toEqual(['1', '2']);
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );
  it('defaults to the last 100 and tolerates unknown limits', () => {
    expect(readResultsFilters(new URLSearchParams())).toEqual(
      DEFAULT_RESULTS_FILTERS,
    );
    expect(readResultsFilters(new URLSearchParams('limit=bad'))).toEqual(
      DEFAULT_RESULTS_FILTERS,
    );
    const rows = makeSolves(Array.from({ length: 600 }, (_, i) => i + 1000));
    const result = analyzeResults(rows, DEFAULT_RESULTS_FILTERS);
    expect(result.points).toHaveLength(100);
    expect(result.points[0]?.ordinal).toBe(501);
    expect(
      analyzeResults(rows, { ...DEFAULT_RESULTS_FILTERS, limit: '500' }).points,
    ).toHaveLength(500);
    expect(
      analyzeResults(rows, { ...DEFAULT_RESULTS_FILTERS, limit: 'all' }).points,
    ).toHaveLength(600);
  });
  it('uses inclusive local days with an exclusive next calendar midnight', () => {
    const start = new Date(2026, 9, 5);
    const next = new Date(2026, 9, 6);
    const rows = [
      start.getTime() - 1,
      start.getTime(),
      next.getTime() - 1,
      next.getTime(),
    ].map((time, i) =>
      makeSolve({ id: String(i), createdAt: new Date(time).toISOString() }),
    );
    const result = analyzeResults(rows, {
      limit: 'all',
      from: '2026-10-05',
      to: '2026-10-05',
    });
    expect(result.points.map((point) => point.solve.id)).toEqual(['1', '2']);
  });
  it('applies dates before the count and keeps global chronology ordinals', () => {
    const rows = Array.from({ length: 250 }, (_, i) =>
      makeSolve({
        id: String(i).padStart(4, '0'),
        createdAt: new Date(2026, 9, i < 200 ? 5 : 6, 12, 0, i).toISOString(),
      }),
    );
    const result = analyzeResults(rows, {
      limit: '100',
      from: '2026-10-05',
      to: '2026-10-05',
    });
    expect(result.matchingDates).toBe(200);
    expect(result.points[0]?.ordinal).toBe(101);
    expect(result.points.at(-1)?.ordinal).toBe(200);
  });
  it.each([
    { from: '2026-10-06', to: '2026-10-05' },
    { from: '2026-02-30', to: '' },
    { from: '', to: 'bad' },
    { from: '2026-13-01', to: '' },
  ])(
    'rejects invalid dates without falling back to all records: %s',
    (dates) => {
      const filters = { limit: 'all' as const, ...dates };
      expect(validResultsDates(filters)).toBe(false);
      expect(analyzeResults(makeSolves([1000]), filters).points).toEqual([]);
    },
  );
  it('sorts tied timestamps by ID without mutating source records', () => {
    const rows = Object.freeze(
      ['b', 'a'].map((id) => Object.freeze(makeSolve({ id }))),
    );
    expect(
      analyzeResults(rows, {
        ...DEFAULT_RESULTS_FILTERS,
        limit: 'all',
      }).points.map((point) => point.solve.id),
    ).toEqual(['a', 'b']);
    expect(rows.map((row) => row.id)).toEqual(['b', 'a']);
  });
});

describe('results chart projections', () => {
  it('uses effective +2 time and null for DNF', () => {
    const rows = makeSolves([1000, null]);
    rows[0] = { ...rows[0]!, penalty: 'PLUS_TWO' };
    const result = analyzeResults(rows, DEFAULT_RESULTS_FILTERS);
    expect(result.points.map((point) => point.timeMs)).toEqual([3000, null]);
    expect(result.statistics.best).toBe(3000);
    expect(result.statistics.mean).toBe(3000);
  });
  it('has no averages before enough selected solves and keeps fractional averages', () => {
    const rows = makeSolves([1000, 1001, 1002, 1003, 1004, 1005]);
    const result = analyzeResults(rows, DEFAULT_RESULTS_FILTERS);
    expect(result.points[3]?.ao5.status).toBe('INSUFFICIENT_DATA');
    expect(result.points[4]?.ao5).toEqual({ status: 'OK', timeMs: 1002 });
    expect(result.points[5]?.ao5).toEqual({ status: 'OK', timeMs: 1003 });
    expect(result.statistics.mean).toBe(1002.5);
    expect(
      result.points.every((point) => point.ao12.status === 'INSUFFICIENT_DATA'),
    ).toBe(true);
  });
  it('starts rolling windows inside the selected range', () => {
    const rows = makeSolves(Array(110).fill(1000));
    const result = analyzeResults(rows, DEFAULT_RESULTS_FILTERS);
    expect(result.points[0]?.ordinal).toBe(11);
    expect(result.points[0]?.ao5.status).toBe('INSUFFICIENT_DATA');
    expect(result.points[4]?.ao5.status).toBe('OK');
    expect(result.points[11]?.ao12.status).toBe('OK');
  });
  it('breaks numeric paths and averages at DNF instead of inserting zero', () => {
    const result = analyzeResults(
      makeSolves([1000, null, 3000, null, 5000]),
      DEFAULT_RESULTS_FILTERS,
    );
    expect(result.points[4]?.ao5.status).toBe('DNF');
    const path = chartPath(
      result.points,
      (point) => point.timeMs,
      (i) => i,
      (ms) => ms,
    );
    expect(path.match(/M/g)).toHaveLength(3);
    expect(path).not.toContain('L');
    expect(path).not.toContain(',0.00');
  });
  it('handles empty and all-DNF collections', () => {
    expect(
      analyzeResults([], DEFAULT_RESULTS_FILTERS).statistics.best,
    ).toBeNull();
    const result = analyzeResults(
      makeSolves(Array(12).fill(null)),
      DEFAULT_RESULTS_FILTERS,
    );
    expect(result.points.every((point) => point.timeMs === null)).toBe(true);
    expect(result.statistics.mean).toBeNull();
    expect(result.statistics.ao12.status).toBe('DNF');
  });
  it('retains all 10,000 solves and the outlier in a bounded-window calculation', () => {
    const rows = makeSolves(
      Array.from({ length: 10000 }, (_, i) => (i === 40 ? 3600000 : 10000 + i)),
    );
    const result = analyzeResults(rows, {
      ...DEFAULT_RESULTS_FILTERS,
      limit: 'all',
    });
    expect(result.points).toHaveLength(10000);
    expect(result.points[40]?.timeMs).toBe(3600000);
    expect(result.points.at(-1)?.ao12.status).toBe('OK');
  });
});
