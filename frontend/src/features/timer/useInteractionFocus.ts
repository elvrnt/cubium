import { useRef } from 'react';
import type { MouseEvent, RefObject } from 'react';

/** Pointer tasks return to timing; explicit keyboard tasks return to their opener. */
export function useInteractionFocus(neutral: RefObject<HTMLElement | null>) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pointer = useRef(false);
  return {
    returnFocusRef,
    onPointerDown: () => {
      pointer.current = true;
    },
    onKeyDown: () => {
      pointer.current = false;
    },
    capture: (event: MouseEvent<HTMLElement>) => {
      const parent = event.currentTarget.closest('dialog');
      returnFocusRef.current =
        pointer.current || event.detail > 0
          ? parent instanceof HTMLElement
            ? parent
            : neutral.current
          : event.currentTarget;
      pointer.current = false;
    },
    finishPointer: () => {
      if (pointer.current) neutral.current?.focus({ preventScroll: true });
      pointer.current = false;
    },
    onBlur: () => {
      pointer.current = false;
    },
  };
}
