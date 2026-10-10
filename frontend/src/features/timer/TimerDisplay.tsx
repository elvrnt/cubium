import { useEffect, useState, type CSSProperties } from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { useTimePreferences } from '../../app/TimePreferences';
import { formatDisplayTimeMs } from './timeFormatting';
import { useLanguage } from '../../app/i18n';

function TimeValue({ text }: { text: string }) {
  const { t } = useLanguage();
  return (
    <div
      className="timer-readout__value"
      style={{ '--time-characters': text.length } as CSSProperties}
      role="timer"
      aria-label={t('Solve time')}
      aria-live="off"
    >
      {text}
    </div>
  );
}

function RunningTime({ application }: { application: TimerApplication }) {
  const { runningDecimals } = useTimePreferences();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let frame: number;
    const renderFrame = () => {
      setElapsed(application.getElapsedTimeMs());
      frame = requestAnimationFrame(renderFrame);
    };
    frame = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frame);
  }, [application]);
  return <TimeValue text={formatDisplayTimeMs(elapsed, runningDecimals)} />;
}

export function TimerDisplay({
  application,
  state,
  controlFocused = false,
  running = state.timer.status === 'running',
}: {
  application: TimerApplication;
  state: TimerApplicationState;
  controlFocused?: boolean;
  running?: boolean;
}) {
  const { t } = useLanguage();
  const { formatSolveTime, formatTimeMs } = useTimePreferences();
  const displayed = state.solves.find(
    (solve) => solve.id === state.displayedSolveId,
  );
  const pending =
    state.persistence.status !== 'idle' &&
    state.persistence.pending.type === 'save'
      ? state.persistence.pending.solve
      : null;
  const labels = {
    idle: state.canArm
      ? t('Idle · Hold Space to get ready')
      : t('Idle · Waiting to start'),
    holding: t('Holding · Keep holding Space'),
    ready: t('Ready · Release Space to start'),
    running: t('Running · Press any key to stop'),
    stopped: t('Stopped · Release the key'),
  };
  const restingResult = pending ?? displayed;
  return (
    <div className="timer-readout" data-state={state.timer.status}>
      {running ? (
        <RunningTime application={application} />
      ) : (
        <TimeValue
          text={
            ['idle', 'stopped'].includes(state.timer.status) && restingResult
              ? formatSolveTime(restingResult)
              : formatTimeMs(0)
          }
        />
      )}
      <p
        className={`timer-readout__status${running ? ' sr-only' : ''}`}
        role="status"
      >
        {controlFocused && ['idle', 'stopped'].includes(state.timer.status)
          ? t('Click the timer or use Tab to return')
          : labels[state.timer.status]}
      </p>
    </div>
  );
}
