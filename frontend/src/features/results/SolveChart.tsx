import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { ResultsPoint } from '../../application/results/resultsAnalysis';
import { chartPath } from '../../application/results/resultsAnalysis';
import { formatSolveTime, formatTimeMs } from '../../domain/solves';
import type { AverageResult } from '../../domain/statistics';
import { useLanguage } from '../../app/i18n';

const averageTime = (value: AverageResult) =>
  value.status === 'OK' ? value.timeMs : null;
const averageLabel = (value: AverageResult) =>
  value.status === 'OK'
    ? formatTimeMs(value.timeMs)
    : value.status === 'DNF'
      ? 'DNF'
      : '—';

export function SolveChart({
  points,
  ao5,
  ao12,
  onToggle,
  onOpen,
  disabled,
}: {
  points: readonly ResultsPoint[];
  ao5: boolean;
  ao12: boolean;
  onToggle: (series: 'ao5' | 'ao12') => void;
  onOpen: (point: ResultsPoint, event: MouseEvent<HTMLElement>) => void;
  disabled: boolean;
}) {
  const { t, language } = useLanguage();
  const region = useRef<HTMLDivElement>(null);
  const fontProbe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 1000, font: 16 });
  const [keyboardInspection, setKeyboardInspection] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const descriptionId = useId();
  const inspectorId = useId();
  useEffect(() => {
    const node = region.current;
    if (!node) return;
    const measure = () =>
      setSize({
        width: Math.max(200, node.getBoundingClientRect().width),
        font: parseFloat(getComputedStyle(node).fontSize) || 16,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // Root text can grow while the chart's width stays fixed. A 1em probe
    // changes size and refreshes geometry even when the outer box does not.
    if (fontProbe.current) observer.observe(fontProbe.current);
    return () => observer.disconnect();
  }, []);
  const activeIndex = Math.max(
    0,
    points.findIndex((point) => point.solve.id === activeId),
  );
  const active =
    points[
      activeId === null || !points.some((point) => point.solve.id === activeId)
        ? points.length - 1
        : activeIndex
    ];
  const selectedIndex = active ? points.indexOf(active) : 0;
  const { width, font } = size;
  const height = Math.max(300, font * 18.75);
  const left = Math.min(width * 0.4, font * 4.5);
  const right = width - 16;
  const top = font * 3.75;
  const bandY = font * 1.8;
  const bottom = height - font * 3;
  // Cursor movement changes only the inspector/selection, not 10,000 path points.
  const geometry = useMemo(() => {
    let max = 1000;
    for (const point of points)
      max = Math.max(
        max,
        point.timeMs ?? 0,
        ao5 ? (averageTime(point.ao5) ?? 0) : 0,
        ao12 ? (averageTime(point.ao12) ?? 0) : 0,
      );
    const ceiling = Math.ceil(max / 1000) * 1000;
    const x = (index: number) =>
      points.length <= 1
        ? (left + right) / 2
        : left + (index / (points.length - 1)) * (right - left);
    const y = (time: number) => bottom - (time / ceiling) * (bottom - top);
    return {
      ceiling,
      x,
      y,
      solves: chartPath(points, (point) => point.timeMs, x, y),
      ao5: ao5
        ? chartPath(points, (point) => averageTime(point.ao5), x, y)
        : '',
      ao12: ao12
        ? chartPath(points, (point) => averageTime(point.ao12), x, y)
        : '',
      dnf: points
        .map((point, index) =>
          point.timeMs === null
            ? `M${x(index) - 3},${bandY}l3,-3l3,3l-3,3Z`
            : '',
        )
        .join(' '),
      markers: points
        .map((point, index) =>
          point.timeMs === null ? '' : `M${x(index) - 1},${y(point.timeMs)}h2`,
        )
        .join(' '),
    };
  }, [points, ao5, ao12, left, right, bottom, top, bandY]);
  const { ceiling, x, y, dnf, markers } = geometry;
  const pick = (clientX: number) => {
    const bounds = region.current!.getBoundingClientRect();
    const index = Math.max(
      0,
      Math.min(
        points.length - 1,
        Math.round(
          ((clientX - bounds.left - left) / (right - left)) *
            (points.length - 1),
        ),
      ),
    );
    const point = points[index];
    if (point) setActiveId(point.solve.id);
    return point;
  };
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const axisFormat = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return (
    <section className="solve-chart">
      <div className="results-section-heading">
        <h2>{t('Solve chart')}</h2>
        <div className="chart-legend">
          <span className="chart-legend__solves">{t('Individual solves')}</span>
          <label className="chart-legend__ao5">
            <input
              type="checkbox"
              checked={ao5}
              onChange={() => onToggle('ao5')}
            />
            ao5
          </label>
          <label className="chart-legend__ao12">
            <input
              type="checkbox"
              checked={ao12}
              onChange={() => onToggle('ao12')}
            />
            ao12
          </label>
        </div>
      </div>
      <p className="results-help">
        {t(
          'Averages use only the selected range; early points may not have enough solves.',
        )}
      </p>
      <div
        ref={region}
        className="chart-surface"
        role="region"
        aria-label={t('Solve chart')}
        aria-describedby={`${descriptionId} ${inspectorId}`}
        tabIndex={0}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse') {
            setKeyboardInspection(false);
            pick(event.clientX);
          }
        }}
        onClick={(event) => {
          const point = event.detail > 0 ? pick(event.clientX) : active;
          if (!disabled && point) onOpen(point, event);
        }}
        onKeyDown={(event) => {
          setKeyboardInspection(true);
          let index = selectedIndex;
          if (event.key === 'ArrowLeft') index--;
          else if (event.key === 'ArrowRight') index++;
          else if (event.key === 'Home') index = 0;
          else if (event.key === 'End') index = points.length - 1;
          else if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.click();
            return;
          } else return;
          event.preventDefault();
          const point = points[Math.max(0, Math.min(points.length - 1, index))];
          if (point) setActiveId(point.solve.id);
        }}
      >
        <span ref={fontProbe} className="chart-font-probe" aria-hidden="true" />
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <text x="0" y={font * 2.05} className="chart-label">
            DNF
          </text>
          <path d={`M${left},${font * 2.75}H${right}`} className="chart-grid" />
          {[0, 1, 2, 3, 4].map((tick) => {
            const time = (ceiling * tick) / 4;
            return (
              <g key={tick}>
                <path
                  d={`M${left},${y(time)}H${right}`}
                  className="chart-grid"
                />
                <text
                  x={left - 8}
                  y={y(time) + 4}
                  textAnchor="end"
                  className="chart-label chart-number"
                >
                  {axisFormat.format(time / 1000)}
                </text>
              </g>
            );
          })}
          <text x="0" y={font * 0.9} className="chart-label">
            {t('Seconds')}
          </text>
          <path
            className="chart-series chart-series--solves"
            d={geometry.solves}
          />
          <path className="chart-markers" d={markers} />
          {ao5 && (
            <path
              className="chart-series chart-series--ao5"
              data-testid="chart-ao5"
              d={geometry.ao5}
            />
          )}
          {ao12 && (
            <path
              className="chart-series chart-series--ao12"
              data-testid="chart-ao12"
              d={geometry.ao12}
            />
          )}
          <path className="chart-dnf" data-testid="chart-dnf" d={dnf} />
          {active && (
            <>
              <path
                className="chart-cursor"
                d={`M${x(selectedIndex)},${font}V${bottom}`}
              />
              <circle
                className="chart-active"
                cx={x(selectedIndex)}
                cy={active.timeMs === null ? bandY : y(active.timeMs)}
                r="4"
              />
            </>
          )}
          <text
            x={left}
            y={height - font * 1.8}
            className="chart-label chart-number"
          >
            {points[0]?.ordinal}
          </text>
          <text
            x={right}
            y={height - font * 1.8}
            textAnchor="end"
            className="chart-label chart-number"
          >
            {points.length > 1 ? points.at(-1)?.ordinal : ''}
          </text>
          <text
            x={(left + right) / 2}
            y={height - font * 0.2}
            textAnchor="middle"
            className="chart-label"
          >
            {t('Solve number')}
          </text>
        </svg>
      </div>
      <p id={descriptionId} className="results-help">
        {t(
          'Use arrows to select a solve, Home/End for the edges and Enter for details.',
        )}
      </p>
      {points.every((point) => point.timeMs === null) && (
        <p className="results-help">
          {t(
            'No numeric times in this range. DNF solves are shown in the separate band.',
          )}
        </p>
      )}
      {active && (
        <div
          id={inspectorId}
          className="chart-inspector"
          role="status"
          aria-live={keyboardInspection ? 'polite' : 'off'}
          aria-atomic="true"
        >
          <span>
            {t('Solve number')}{' '}
            <span className="measurement">{active.ordinal}</span>
          </span>
          <strong className="measurement">
            {formatSolveTime(active.solve)}
          </strong>
          <time dateTime={active.solve.createdAt}>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(active.solve.createdAt))}
          </time>
          <span>
            {t('Penalty')}:{' '}
            {active.solve.penalty === 'NONE'
              ? t('None')
              : active.solve.penalty === 'PLUS_TWO'
                ? '+2'
                : 'DNF'}
          </span>
          <span>
            ao5 <span className="measurement">{averageLabel(active.ao5)}</span>
          </span>
          <span>
            ao12{' '}
            <span className="measurement">{averageLabel(active.ao12)}</span>
          </span>
        </div>
      )}
    </section>
  );
}
