import type { RefObject } from 'react';
import { NavLink } from 'react-router';
import { useLanguage } from './i18n';
import { useInteractionFocus } from '../features/timer/useInteractionFocus';

export function SiteHeader({
  neutralRef,
  headerRef,
  running = false,
}: {
  neutralRef: RefObject<HTMLElement | null>;
  headerRef?: RefObject<HTMLElement | null>;
  running?: boolean;
}) {
  const { t, language, setLanguage } = useLanguage();
  const focus = useInteractionFocus(neutralRef);
  return (
    <header
      ref={headerRef}
      className="site-header timer-chrome"
      inert={running}
      aria-hidden={running || undefined}
    >
      <NavLink className="brand" to="/" aria-label={t('Cubium home')}>
        <span className="brand__mark" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="2" width="20" height="20" />
            <path d="M8.67 2v20M15.33 2v20M2 8.67h20M2 15.33h20" />
          </svg>
        </span>
        Cubium
      </NavLink>
      <nav aria-label={t('Main navigation')}>
        <NavLink to="/" end>
          {t('Timer')}
        </NavLink>
        <NavLink to="/results">{t('Results')}</NavLink>
      </nav>
      <span className="site-header__local">
        3×3 <span aria-hidden="true">·</span> {t('Saved on this device')}
      </span>
      <label className="language-selector">
        <span className="sr-only">{t('Language')}</span>
        <select
          value={language}
          onPointerDown={focus.onPointerDown}
          onKeyDown={focus.onKeyDown}
          onBlur={focus.onBlur}
          onChange={(event) => {
            setLanguage(event.target.value === 'en' ? 'en' : 'ru');
            focus.finishPointer();
          }}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </label>
    </header>
  );
}
