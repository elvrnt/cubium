import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { formatSolveTime, MAX_SOLVE_NOTE_LENGTH } from '../../domain/solves';
import type { Solve, SolvePenalty } from '../../domain/solves';
import { useLanguage } from '../../app/i18n';
import { Dialog } from './Dialog';
import { useInteractionFocus } from './useInteractionFocus';
import { SolveCreatedAt } from './SolveCreatedAt';

export function ResultActions({
  application,
  solve,
  persistence,
  disabled,
  onEditingChange,
  onError,
  onDeleted,
  timerFocusRef,
}: {
  application: TimerApplication;
  solve: Readonly<Solve>;
  persistence: TimerApplicationState['persistence'];
  disabled: boolean;
  onEditingChange: (editing: boolean) => void;
  onError: (error: unknown) => void;
  onDeleted?: () => void;
  timerFocusRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useLanguage();
  const noteId = useId();
  const countId = useId();
  const [editor, setEditor] = useState<'note' | 'delete' | null>(null);
  const [note, setNote] = useState(solve.note ?? '');
  const invalidNote = note.length > MAX_SOLVE_NOTE_LENGTH;
  const focus = useInteractionFocus(timerFocusRef);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    onEditingChange(editor !== null);
    return () => onEditingChange(false);
  }, [editor, onEditingChange]);
  const close = () => {
    setEditor(null);
  };
  const penalty = (value: SolvePenalty) => {
    void application
      .setPenalty(solve.id, solve.penalty === value ? 'NONE' : value)
      .catch(onError);
  };
  const saveNote = async () => {
    if (invalidNote) return;
    try {
      await application.updateNote(solve.id, note);
      if (application.getState().persistence.status === 'idle') close();
    } catch (error) {
      onError(error);
    }
  };
  return (
    <section className="result-actions" aria-label={t('Solve actions')}>
      <p className="result-actions__caption">
        {t('Result')} <strong>{formatSolveTime(solve)}</strong>
      </p>
      <div className="result-actions__buttons">
        <button
          onPointerDown={focus.onPointerDown}
          onKeyDown={focus.onKeyDown}
          disabled={disabled}
          onClick={(event) => {
            focus.capture(event);
            setNote(solve.note ?? '');
            setEditor('note');
          }}
        >
          {t('Note')}
        </button>
        <button
          disabled={disabled}
          aria-pressed={solve.penalty === 'PLUS_TWO'}
          onClick={() => penalty('PLUS_TWO')}
        >
          +2
        </button>
        <button
          disabled={disabled}
          aria-pressed={solve.penalty === 'DNF'}
          onClick={() => penalty('DNF')}
        >
          DNF
        </button>
        <button
          onPointerDown={focus.onPointerDown}
          onKeyDown={focus.onKeyDown}
          disabled={disabled}
          onClick={(event) => {
            focus.capture(event);
            setEditor('delete');
          }}
        >
          {t('Delete')}
        </button>
      </div>
      {editor === null && solve.note !== null && solve.note !== '' && (
        <p className="result-actions__note">{solve.note}</p>
      )}
      {editor === 'note' && (
        <Dialog
          title={t('Note for solve')}
          onClose={close}
          compact
          returnFocusRef={focus.returnFocusRef}
          fallbackFocusRef={timerFocusRef}
          initialFocusRef={textarea}
        >
          <p>
            {t('Result')} <strong>{formatSolveTime(solve)}</strong>
          </p>
          <SolveCreatedAt createdAt={solve.createdAt} />
          <form
            className="result-editor"
            data-timer-shortcuts="off"
            onSubmit={(event) => {
              event.preventDefault();
              void saveNote();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
          >
            <label htmlFor={noteId}>{t('Note for solve')}</label>
            <textarea
              id={noteId}
              maxLength={MAX_SOLVE_NOTE_LENGTH}
              aria-describedby={countId}
              aria-invalid={invalidNote}
              ref={textarea}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={persistence.status !== 'idle'}
              rows={3}
            />
            <p id={countId} className="note-count">
              {t('Characters used')}: {note.length} / {MAX_SOLVE_NOTE_LENGTH}
              {invalidNote && (
                <span role="alert"> — {t('Note is too long')}</span>
              )}
            </p>
            <div>
              <button type="submit" disabled={disabled || invalidNote}>
                {t('Save note')}
              </button>
              <button type="button" onClick={close}>
                {t('Cancel')}
              </button>
            </div>
          </form>
          {persistence.status === 'error' && (
            <PersistenceRetry application={application} />
          )}
        </Dialog>
      )}
      {editor === 'delete' && (
        <Dialog
          title={t('Delete this solve? This cannot be undone.')}
          onClose={close}
          compact
          returnFocusRef={focus.returnFocusRef}
          fallbackFocusRef={timerFocusRef}
          initialFocusRef={cancelDelete}
        >
          <div
            className="result-editor"
            data-timer-shortcuts="off"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
              }
            }}
          >
            <p>
              {t('Result')} <strong>{formatSolveTime(solve)}</strong>
            </p>
            <SolveCreatedAt createdAt={solve.createdAt} />
            <div>
              <button
                className="danger"
                disabled={disabled}
                onClick={() => {
                  void application
                    .deleteSolve(solve.id)
                    .then(() => {
                      if (
                        application.getState().persistence.status === 'idle'
                      ) {
                        close();
                        onDeleted?.();
                      }
                    })
                    .catch(onError);
                }}
              >
                {t('Confirm delete')}
              </button>
              <button ref={cancelDelete} onClick={close}>
                {t('Cancel')}
              </button>
            </div>
          </div>
          {persistence.status === 'error' && (
            <PersistenceRetry application={application} />
          )}
        </Dialog>
      )}
    </section>
  );
}

function PersistenceRetry({ application }: { application: TimerApplication }) {
  const { t } = useLanguage();
  return (
    <div role="alert">
      <p>
        {t(
          'Could not save your change. It is still held in memory. Retry before closing this page.',
        )}
      </p>
      <button
        onClick={() => {
          void application.retryPersistence();
        }}
      >
        {t('Retry save')}
      </button>
    </div>
  );
}
