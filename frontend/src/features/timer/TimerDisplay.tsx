import { useEffect, useState } from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { formatSolveTime, formatTimeMs } from '../../domain/solves';

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
  const latest = state.solves.at(-1);
  const pending =
    state.persistence.status !== 'idle' &&
    state.persistence.pending.type === 'save'
      ? state.persistence.pending.solve
      : null;
  const labels = {
    idle: state.canArm
      ? 'Idle · Hold Space to get ready'
      : 'Idle · Waiting to start',
    holding: 'Holding · Keep holding Space',
    ready: 'Ready · Release Space to start',
    running: 'Running · Press Space to stop',
    stopped: 'Stopped · Release Space',
  };
  const restingResult = pending ?? latest;
  return (
    <div className="timer-readout" data-state={state.timer.status}>
      <div
        className="timer-readout__value"
        role="timer"
        aria-label="Solve time"
        aria-live="off"
      >
        {state.timer.status === 'running' ? (
          <RunningTime application={application} />
        ) : state.timer.status === 'stopped' ? (
          formatTimeMs(state.timer.elapsedMs)
        ) : state.timer.status === 'idle' && restingResult ? (
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
