import { useMemo } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { TimerApplication } from '../application/timer';
import type { TimerClock } from '../domain/timer';
import { createAppRoutes } from './router';
import { LanguageProvider } from './i18n';

export function App({
  application,
  clock,
  router: providedRouter,
}: {
  application: TimerApplication;
  clock: TimerClock;
  router?: ReturnType<typeof createMemoryRouter>;
}) {
  // Production passes a browser router created with the runtime outside React.
  // An embedded App (including component tests) gets an isolated memory router.
  const router = useMemo(
    () =>
      providedRouter ??
      createMemoryRouter(createAppRoutes({ application, clock })),
    [providedRouter, application, clock],
  );
  return (
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>
  );
}
