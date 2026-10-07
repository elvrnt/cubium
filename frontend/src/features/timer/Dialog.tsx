import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useLanguage } from '../../app/i18n';

/** Native modal supplies focus trapping, Escape and background inertness. */
export function Dialog({
  title,
  onClose,
  children,
  closeOnBackdrop = false,
  returnFocusRef,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useLanguage();
  useEffect(() => {
    const opener = document.activeElement;
    const destination = returnFocusRef?.current ?? opener;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (destination instanceof HTMLElement && destination.isConnected)
        destination.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  return (
    <dialog
      ref={ref}
      className="timer-dialog"
      aria-labelledby={titleId}
      data-timer-shortcuts="off"
      onClick={(event) => {
        if (!closeOnBackdrop || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
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
