import { useTimePreferences } from '../../app/TimePreferences';
import { useEffect, useRef, useState } from 'react';
import type { TimerApplication } from '../../application/timer';
import type { Solve } from '../../domain/solves';
import { useLanguage } from '../../app/i18n';

/** Observe completion synchronously: React can batch stop and key release together. */
export function SolveAnnouncement({
  application,
}: {
  application: TimerApplication;
}) {
  const { t } = useLanguage();
  const { formatSolveTime } = useTimePreferences();
  const lastCompleted = useRef<Readonly<Solve> | null>(null);
  const [message, setMessage] = useState('');
  useEffect(
    () =>
      application.subscribe(() => {
        const state = application.getState();
        if (state.timer.status === 'running') {
          setMessage('');
          return;
        }
        const pending =
          state.persistence.status !== 'idle'
            ? state.persistence.pending
            : null;
        if (
          pending?.type === 'save' &&
          pending.solve.id !== lastCompleted.current?.id
        ) {
          lastCompleted.current = pending.solve;
          setMessage(
            `${t('Solve completed')}: ${formatSolveTime(pending.solve)}`,
          );
          return;
        }
        // Corrections to this newly completed result are distinct from completion.
        // Loading/editing older history and retrying the same save stay silent.
        const current = state.solves.find(
          (solve) => solve.id === lastCompleted.current?.id,
        );
        if (current && current.penalty !== lastCompleted.current?.penalty) {
          lastCompleted.current = current;
          setMessage(`${t('Result updated')}: ${formatSolveTime(current)}`);
        }
      }),
    [application, t, formatSolveTime],
  );
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="solve-announcement"
    >
      {message}
    </div>
  );
}
