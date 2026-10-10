import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { MAX_SESSION_NAME_LENGTH, type Session } from '../../domain/sessions';
import { useLanguage } from '../../app/i18n';
import { Dialog } from '../timer/Dialog';
import { useInteractionFocus } from '../timer/useInteractionFocus';

import './sessions.css';

export function SessionControls({
  application,
  state,
  neutralRef,
  disabled,
  onOpenChange,
}: {
  application: TimerApplication;
  state: TimerApplicationState;
  neutralRef: RefObject<HTMLElement | null>;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const focus = useInteractionFocus(neutralRef);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ id: string | null; name: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Readonly<Session> | null>(null);
  const [error, setError] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const parentRef = useRef<HTMLElement | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const pointerSelection = useRef(false);
  const restoreSelectionFocus = useRef(false);
  useLayoutEffect(() => {
    if (state.persistence.status === 'idle' && restoreSelectionFocus.current) {
      restoreSelectionFocus.current = false;
      selectRef.current?.focus({ preventScroll: true });
    }
  }, [state.persistence.status]);
  const active = state.sessions.filter(
    (session) => session.archivedAt === null,
  );
  const saving = state.persistence.status !== 'idle';
  const invalid =
    form !== null &&
    (!form.name.trim() || form.name.trim().length > MAX_SESSION_NAME_LENGTH);
  useEffect(() => {
    onOpenChange(open);
    return () => onOpenChange(false);
  }, [open, onOpenChange]);
  const run = async (task: () => Promise<void>) => {
    setError(false);
    try {
      await task();
      if (application.getState().persistence.status === 'idle') {
        setForm(null);
        setDeleting(null);
      }
    } catch {
      setError(true);
    }
  };
  if (state.history.status !== 'ready') return null;
  const rows = (sessions: readonly Readonly<Session>[]) =>
    sessions.map((session) => {
      const last = session.archivedAt === null && active.length === 1;
      return (
        <li key={session.id} className="session-row">
          <div>
            <strong>{session.name}</strong>
            <span>
              {t('Solves')}: {state.sessionSolveCounts[session.id] ?? 0}
              {session.id === state.activeSessionId ? ` · ${t('Current')}` : ''}
            </span>
          </div>
          <div className="session-row__actions">
            <button
              disabled={saving}
              onClick={() => setForm({ id: session.id, name: session.name })}
            >
              {t('Rename')}
            </button>
            {session.archivedAt === null ? (
              <button
                disabled={saving || last}
                onClick={() =>
                  void run(() => application.archiveSession(session.id))
                }
              >
                {t('Archive')}
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={() =>
                  void run(() => application.restoreSession(session.id))
                }
              >
                {t('Restore')}
              </button>
            )}
            <button
              className="danger"
              disabled={saving || last}
              onClick={(event) => {
                parentRef.current = event.currentTarget.closest('dialog');
                setDeleting(session);
              }}
            >
              {t('Delete')}
            </button>
          </div>
          {last && (
            <p>
              {t(
                'Create another session before archiving or deleting this one.',
              )}
            </p>
          )}
        </li>
      );
    });
  return (
    <>
      <section
        className="session-controls timer-chrome"
        aria-label={t('Session')}
        inert={state.timer.status === 'running'}
        aria-hidden={state.timer.status === 'running' || undefined}
      >
        <label>
          <span>{t('Session')}</span>
          <select
            ref={selectRef}
            aria-label={t('Session')}
            value={state.activeSessionId ?? ''}
            disabled={disabled || saving}
            onPointerDown={() => {
              pointerSelection.current = true;
              focus.onPointerDown();
            }}
            onKeyDown={() => {
              pointerSelection.current = false;
              focus.onKeyDown();
            }}
            onBlur={focus.onBlur}
            onChange={(event) => {
              if (event.target.value === state.activeSessionId) {
                restoreSelectionFocus.current = false;
                pointerSelection.current = false;
                focus.finishPointer();
                return;
              }
              restoreSelectionFocus.current =
                !pointerSelection.current &&
                document.activeElement === event.currentTarget;
              pointerSelection.current = false;
              void run(() => application.selectSession(event.target.value));
              focus.finishPointer();
            }}
          >
            {active.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={disabled || saving}
          onPointerDown={focus.onPointerDown}
          onKeyDown={focus.onKeyDown}
          onClick={(event) => {
            focus.capture(event);
            setOpen(true);
          }}
        >
          {t('Manage sessions')}
        </button>
      </section>
      {open && (
        <Dialog
          title={t('Manage sessions')}
          returnFocusRef={focus.returnFocusRef}
          fallbackFocusRef={neutralRef}
          onClose={() => {
            setOpen(false);
            setForm(null);
            setError(false);
          }}
        >
          <div className="session-manager">
            <button
              disabled={saving}
              onClick={() => setForm({ id: null, name: '' })}
            >
              {t('Create session')}
            </button>
            {form && (
              <form
                className="session-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!invalid)
                    void run(() =>
                      form.id === null
                        ? application.createSession(form.name)
                        : application.renameSession(form.id, form.name),
                    );
                }}
              >
                <label>
                  {t('Session name')}
                  <input
                    autoFocus
                    value={form.name}
                    aria-invalid={invalid}
                    aria-describedby="session-name-help"
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </label>
                <p id="session-name-help">
                  {t('Use 1–80 characters; spaces at the edges are removed.')}
                </p>
                <div>
                  <button type="submit" disabled={saving || invalid}>
                    {t('Save session')}
                  </button>
                  <button type="button" onClick={() => setForm(null)}>
                    {t('Cancel')}
                  </button>
                </div>
              </form>
            )}
            <ul>{rows(active)}</ul>
            <h3>{t('Archived sessions')}</h3>
            <ul>
              {rows(
                state.sessions.filter((session) => session.archivedAt !== null),
              )}
            </ul>
            {error && (
              <p role="alert">
                {t('Could not change the session. Please try again.')}
              </p>
            )}
            {state.persistence.status === 'error' && !deleting && (
              <div role="alert">
                <p>{t('Could not change the session. Please try again.')}</p>
                <button
                  onClick={() => void run(() => application.retryPersistence())}
                >
                  {t('Retry save')}
                </button>
              </div>
            )}
          </div>
          {deleting && (
            <Dialog
              compact
              title={t('Delete session?')}
              returnFocusRef={parentRef}
              initialFocusRef={cancelRef}
              onClose={() => setDeleting(null)}
            >
              <p className="session-delete-name">{deleting.name}</p>
              <p>
                {t('Solves')}: {state.sessionSolveCounts[deleting.id] ?? 0}
              </p>
              <p>
                {t(
                  'The session and all its solves will be permanently deleted.',
                )}
              </p>
              <div className="session-row__actions">
                <button ref={cancelRef} onClick={() => setDeleting(null)}>
                  {t('Cancel')}
                </button>
                <button
                  className="danger"
                  disabled={saving}
                  onClick={() =>
                    void run(() => application.deleteSession(deleting.id))
                  }
                >
                  {t('Delete session')}
                </button>
              </div>
              {state.persistence.status === 'error' && (
                <div role="alert">
                  <p>{t('Could not change the session. Please try again.')}</p>
                  <button
                    onClick={() =>
                      void run(() => application.retryPersistence())
                    }
                  >
                    {t('Retry save')}
                  </button>
                </div>
              )}
            </Dialog>
          )}
        </Dialog>
      )}
      {!open &&
        state.persistence.status === 'error' &&
        state.persistence.pending.type === 'session' && (
          <div className="session-error" role="alert">
            <p>{t('Could not change the session. Please try again.')}</p>
            <button
              onClick={() => void run(() => application.retryPersistence())}
            >
              {t('Retry save')}
            </button>
          </div>
        )}
    </>
  );
}
