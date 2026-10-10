import { useState, type RefObject } from 'react';
import { useLanguage } from '../../app/i18n';
import { useTimePreferences } from '../../app/TimePreferences';
import { IconButton } from '../shared/IconButton';
import { Dialog } from './Dialog';
import { useInteractionFocus } from './useInteractionFocus';
import { formatDisplayTimeMs } from './timeFormatting';

export function TimerSettings({
  disabled,
  neutralRef,
  onOpenChange,
}: {
  disabled: boolean;
  neutralRef: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const {
    runningDecimals,
    resultDecimals,
    setRunningDecimals,
    setResultDecimals,
  } = useTimePreferences();
  const focus = useInteractionFocus(neutralRef);
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onOpenChange(false);
  };
  const choices = [
    { value: 0, label: t('Whole seconds') },
    { value: 1, label: t('Tenths') },
    { value: 2, label: t('Hundredths') },
    { value: 3, label: t('Thousandths') },
  ] as const;
  return (
    <>
      <IconButton
        icon="gear"
        label={t('Timer settings')}
        disabled={disabled}
        onPointerDown={focus.onPointerDown}
        onKeyDown={focus.onKeyDown}
        onClick={(event) => {
          focus.capture(event);
          setOpen(true);
          onOpenChange(true);
        }}
      />
      {open && (
        <Dialog
          title={t('Timer settings')}
          onClose={close}
          compact
          returnFocusRef={focus.returnFocusRef}
          fallbackFocusRef={neutralRef}
        >
          <div className="timer-settings">
            <label>
              {t('While running')}
              <select
                value={runningDecimals}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value === 0 || value === 1 || value === 2 || value === 3)
                    setRunningDecimals(value);
                }}
              >
                {choices.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label} · {formatDisplayTimeMs(12345, value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Results')}
              <select
                value={resultDecimals}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value === 2 || value === 3) setResultDecimals(value);
                }}
              >
                {choices
                  .filter(({ value }) => value >= 2)
                  .map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label} · {formatDisplayTimeMs(12345, value)}
                    </option>
                  ))}
              </select>
            </label>
            <p>
              {t(
                'Saved on this device. Display precision does not change measured or saved times.',
              )}
            </p>
          </div>
        </Dialog>
      )}
    </>
  );
}
