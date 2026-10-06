import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../app/i18n';

/** Native modal supplies focus trapping, Escape and background inertness. */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useLanguage();
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="timer-dialog"
      aria-labelledby={titleId}
      data-timer-shortcuts="off"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button onClick={onClose} autoFocus>
          {t('Close')}
        </button>
      </header>
      {children}
    </dialog>
  );
}
