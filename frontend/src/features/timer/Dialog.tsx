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
  initialFocusRef,
  compact = false,
  fallbackFocusRef,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useLanguage();
  useEffect(() => {
    const opener = document.activeElement;
    const destination = returnFocusRef?.current ?? opener;
    const fallback = fallbackFocusRef?.current;
    const dialog = ref.current!;
    dialog.showModal();
    initialFocusRef?.current?.focus();
    return () => {
      dialog.close();
      const target =
        destination instanceof HTMLElement && destination.isConnected
          ? destination
          : fallback;
      target?.focus({ preventScroll: true });
    };
  }, [returnFocusRef, initialFocusRef, fallbackFocusRef]);
  return (
    <dialog
      ref={ref}
      className={`timer-dialog${compact ? ' timer-dialog--compact' : ''}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-timer-shortcuts="off"
      onKeyDown={(event) => {
        // Native inertness protects the background; wrap the boundary explicitly
        // so Tab stays in the task instead of visiting browser chrome.
        if (
          event.key !== 'Tab' ||
          (event.target as Element).closest('dialog') !== event.currentTarget
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], input, textarea, select, [tabindex]',
          ),
        ).filter(
          (node) =>
            node.tabIndex >= 0 &&
            !node.matches(':disabled') &&
            node.closest('dialog') === event.currentTarget &&
            node.getClientRects().length > 0,
        );
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (
          event.shiftKey &&
          (active === first || active === event.currentTarget)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (active === last || active === event.currentTarget)
        ) {
          event.preventDefault();
          first?.focus();
        }
      }}
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
        event.stopPropagation();
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
