import type { TimerApplication } from '../application/timer';
import type { TimerClock } from '../domain/timer';
import { TimerPage } from '../features/timer/TimerPage';
import { LanguageProvider } from './i18n';

export function App(props: {
  application: TimerApplication;
  clock: TimerClock;
}) {
  return (
    <LanguageProvider>
      <TimerPage {...props} />
    </LanguageProvider>
  );
}
