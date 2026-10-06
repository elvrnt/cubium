import { useEffect, useState } from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { formatSolveTime, formatTimeMs } from '../../domain/solves';
import { useLanguage } from '../../app/i18n';

function RunningTime({ application }: { application: TimerApplication }) {
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
  return <>{formatTimeMs(elapsed)}</>;
}

export function TimerDisplay({
  application,
  state,
}: {
  application: TimerApplication;
  state: TimerApplicationState;
}) {
  const { t } = useLanguage();
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
    running: t('Running · Press Space to stop'),
    stopped: t('Stopped · Release Space'),
  };
  const restingResult = pending ?? displayed;
  return (
    <div className="timer-readout" data-state={state.timer.status}>
      <div
        className="timer-readout__value"
        role="timer"
        aria-label={t('Solve time')}
        aria-live="off"
      >
        {state.timer.status === 'running' ? (
          <RunningTime application={application} />
        ) : ['idle', 'stopped'].includes(state.timer.status) &&
          restingResult ? (
          formatSolveTime(restingResult)
        ) : (
          '0.000'
        )}
      </div>
      <p className="timer-readout__status" role="status">
        {labels[state.timer.status]}
      </p>
    </div>
  );
}
