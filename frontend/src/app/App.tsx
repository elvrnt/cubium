import type { TimerApplication } from '../application/timer';
import type { TimerClock } from '../domain/timer';
import { TimerPage } from '../features/timer/TimerPage';

export function App(props: {
  application: TimerApplication;
  clock: TimerClock;
}) {
  return <TimerPage {...props} />;
}
