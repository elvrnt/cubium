import { useEffect, useId, useRef, useState } from 'react';
import type {
  TimerApplication,
  TimerApplicationState,
} from '../../application/timer';
import { formatSolveTime, MAX_SOLVE_NOTE_LENGTH } from '../../domain/solves';
import type { Solve, SolvePenalty } from '../../domain/solves';
import { useLanguage } from '../../app/i18n';

export function ResultActions({
  application,
  solve,
  persistence,
  disabled,
  onEditingChange,
  onError,
  onDeleted,
}: {
  application: TimerApplication;
  solve: Readonly<Solve>;
  persistence: TimerApplicationState['persistence'];
  disabled: boolean;
  onEditingChange: (editing: boolean) => void;
  onError: (error: unknown) => void;
  onDeleted?: () => void;
}) {
  const { t } = useLanguage();
  const noteId = useId();
  const countId = useId();
  const [editor, setEditor] = useState<'note' | 'delete' | null>(null);
  const [note, setNote] = useState(solve.note ?? '');
  const invalidNote = note.length > MAX_SOLVE_NOTE_LENGTH;
  const noteButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);
  const previousEditor = useRef(editor);
  useEffect(() => {
    onEditingChange(editor !== null);
    if (editor === 'note') textarea.current?.focus();
    if (editor === 'delete') cancelDelete.current?.focus();
    if (editor === null && previousEditor.current === 'note')
      noteButton.current?.focus();
    if (editor === null && previousEditor.current === 'delete')
      deleteButton.current?.focus();
    previousEditor.current = editor;
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
          ref={noteButton}
          disabled={disabled || editor !== null}
          onClick={() => {
            setNote(solve.note ?? '');
            setEditor('note');
          }}
        >
          {t('Note')}
        </button>
        <button
          disabled={disabled || editor !== null}
          aria-pressed={solve.penalty === 'PLUS_TWO'}
          onClick={() => penalty('PLUS_TWO')}
        >
          +2
        </button>
        <button
          disabled={disabled || editor !== null}
          aria-pressed={solve.penalty === 'DNF'}
          onClick={() => penalty('DNF')}
        >
          DNF
        </button>
        <button
          ref={deleteButton}
          disabled={disabled || editor !== null}
          onClick={() => setEditor('delete')}
        >
          {t('Delete')}
        </button>
      </div>
      {editor === null && solve.note !== null && solve.note !== '' && (
        <p className="result-actions__note">{solve.note}</p>
      )}
      {editor === 'note' && (
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
      )}
      {editor === 'delete' && (
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
          <p>{t('Delete this solve? This cannot be undone.')}</p>
          <div>
            <button
              className="danger"
              disabled={disabled}
              onClick={() => {
                void application
                  .deleteSolve(solve.id)
                  .then(() => {
                    if (application.getState().persistence.status === 'idle')
                      onDeleted?.();
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
      )}
    </section>
  );
}
