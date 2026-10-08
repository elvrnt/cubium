import type { RouteObject } from 'react-router';
import { Link } from 'react-router';
import type { TimerApplication } from '../application/timer';
import type { TimerClock } from '../domain/timer';
import { TimerPage } from '../features/timer/TimerPage';
import { ResultsPage } from '../features/results/ResultsPage';
import { useLanguage } from './i18n';

export function createAppRoutes(runtime: {
  application: TimerApplication;
  clock: TimerClock;
}): RouteObject[] {
  return [
    { path: '/', element: <TimerPage {...runtime} /> },
    {
      path: '/results',
      element: <ResultsPage application={runtime.application} />,
    },
    { path: '*', element: <NotFound /> },
  ];
}
// Route configuration intentionally keeps its small fallback component local.
// eslint-disable-next-line react-refresh/only-export-components
function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="timer-page">
      <h1>{t('Page not found')}</h1>
      <Link to="/">{t('Timer')}</Link>
    </main>
  );
}
