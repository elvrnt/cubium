import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout engine; browser geometry is verified with Playwright.
globalThis.ResizeObserver = class implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (typeof window !== 'undefined') window.scrollTo = () => {};

afterEach(cleanup);
