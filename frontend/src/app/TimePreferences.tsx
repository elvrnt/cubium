import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Solve } from '../domain/solves';
import {
  formatDisplaySolveTime,
  formatDisplayTimeMs,
  type RunningDecimals,
  type ResultDecimals,
} from '../features/timer/timeFormatting';

interface TimePreferences {
  runningDecimals: RunningDecimals;
  resultDecimals: ResultDecimals;
}
const defaults: TimePreferences = { runningDecimals: 2, resultDecimals: 3 };
const storageKey = 'cubium.time-display';
const Context = createContext({
  ...defaults,
  setRunningDecimals: (_value: RunningDecimals) => {
    void _value;
  },
  setResultDecimals: (_value: ResultDecimals) => {
    void _value;
  },
});

function readPreferences(): TimePreferences {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    );
    if (!value || typeof value !== 'object') return defaults;
    const running =
      'runningDecimals' in value ? value.runningDecimals : undefined;
    const result = 'resultDecimals' in value ? value.resultDecimals : undefined;
    return {
      runningDecimals:
        running === 0 || running === 1 || running === 2 || running === 3
          ? running
          : defaults.runningDecimals,
      resultDecimals:
        result === 2 || result === 3 ? result : defaults.resultDecimals,
    };
  } catch {
    return defaults;
  }
}

export function TimePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const setRunningDecimals = useCallback(
    (runningDecimals: RunningDecimals) =>
      setPreferences((value) => ({ ...value, runningDecimals })),
    [],
  );
  const setResultDecimals = useCallback(
    (resultDecimals: ResultDecimals) =>
      setPreferences((value) => ({ ...value, resultDecimals })),
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      /* Display preferences remain usable when storage is unavailable. */
    }
  }, [preferences]);
  return (
    <Context.Provider
      value={{ ...preferences, setRunningDecimals, setResultDecimals }}
    >
      {children}
    </Context.Provider>
  );
}

// Provider and consumer share this small presentation-only context.
// eslint-disable-next-line react-refresh/only-export-components
export function useTimePreferences() {
  const preferences = useContext(Context);
  const formatTimeMs = useCallback(
    (timeMs: number) => formatDisplayTimeMs(timeMs, preferences.resultDecimals),
    [preferences.resultDecimals],
  );
  const formatSolveTime = useCallback(
    (solve: Readonly<Solve>) =>
      formatDisplaySolveTime(solve, preferences.resultDecimals),
    [preferences.resultDecimals],
  );
  return { ...preferences, formatTimeMs, formatSolveTime };
}
