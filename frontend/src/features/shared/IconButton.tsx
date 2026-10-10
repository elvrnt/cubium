import type { ComponentPropsWithRef } from 'react';

const paths = {
  gear: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1zM15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
  close: 'M6 6l12 12M18 6 6 18',
  note: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',
  delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  add: 'M12 5v14M5 12h14',
  check: 'M5 12l4 4L19 6',
  edit: 'm4 16 11-11 4 4L8 20H4zM13 7l4 4',
  archive: 'M3 3h18v5H3zM5 8v13h14V8M9 12h6',
  restore: 'M4 9a8 8 0 1 1 0 6M4 3v6h6M12 8v5l3 2',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  previous: 'm15 5-7 7 7 7',
  next: 'm9 5 7 7-7 7',
} as const;

/** One stroke family; native button behavior and localized accessible names. */
export function IconButton({
  icon,
  label,
  className = '',
  type = 'button',
  ...props
}: Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'aria-label' | 'title'
> & {
  icon: keyof typeof paths;
  label: string;
}) {
  return (
    <button
      {...props}
      type={type}
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d={paths[icon]} />
      </svg>
    </button>
  );
}
