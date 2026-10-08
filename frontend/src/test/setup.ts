import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { transferableAbortController } from 'node:util';

// React Router constructs Node's Request in jsdom. Its signal must come from
// the same implementation; jsdom's AbortSignal fails Node's WebIDL brand check.
const nodeAbort = transferableAbortController();
globalThis.AbortController = nodeAbort.constructor as typeof AbortController;
globalThis.AbortSignal = nodeAbort.signal.constructor as typeof AbortSignal;

// jsdom has no layout engine; browser geometry is verified with Playwright.
globalThis.ResizeObserver = class implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (typeof window !== 'undefined') window.scrollTo = () => {};
// jsdom lacks native dialog behavior. Chromium tests verify trapping and Escape.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}

afterEach(cleanup);
