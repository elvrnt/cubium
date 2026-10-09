import { useLayoutEffect, useRef } from 'react';

/** Layout and scroll effects only; the application remains the timing authority. */
export function useTimerPresentation(ready: boolean, running: boolean) {
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrambleRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!ready) return;
    const page = pageRef.current;
    const header = headerRef.current;
    const scramble = scrambleRef.current;
    const center = centerRef.current;
    const workspace = page?.querySelector<HTMLElement>('.timer-workspace');
    const statistics = page?.querySelector<HTMLElement>('.timer-statistics');
    if (!page || !header || !scramble || !center || !workspace || !statistics)
      return;
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height;
      const scrambleHeight = scramble.getBoundingClientRect().height;
      const valueHeight =
        center.querySelector('[role="timer"]')?.getBoundingClientRect()
          .height ?? 0;
      page.style.setProperty('--header-height', `${headerHeight}px`);
      page.style.setProperty('--scramble-height', `${scrambleHeight}px`);
      page.style.setProperty('--readout-height', `${valueHeight}px`);
      page.style.setProperty(
        '--statistics-height',
        `${statistics.getBoundingClientRect().height}px`,
      );
      if (page.dataset.running !== 'true') {
        const style = getComputedStyle(workspace);
        const contentHeight =
          workspace.getBoundingClientRect().height -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom);
        page.style.setProperty('--workspace-height', `${contentHeight}px`);
      }
      page.style.setProperty(
        '--viewport-offset',
        `${(innerWidth - document.documentElement.clientWidth) / 2}px`,
      );
      page.dataset.layout =
        headerHeight + scrambleHeight + 24 + valueHeight / 2 > innerHeight / 2
          ? 'flow'
          : 'centered';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(scramble);
    observer.observe(center);
    observer.observe(workspace);
    observer.observe(statistics);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ready]);

  useLayoutEffect(() => {
    if (!running) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const { scrollX, scrollY } = window;
    root.style.overflow = 'hidden';
    centerRef.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = previousOverflow;
      window.scrollTo(scrollX, scrollY);
    };
  }, [running]);

  return { pageRef, headerRef, scrambleRef, centerRef };
}
