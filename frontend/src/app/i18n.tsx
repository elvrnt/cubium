import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const russian = {
  Timer: 'Таймер',
  '3×3 Timer': 'Таймер 3×3',
  'Cubium home': 'Cubium — главная',
  'Main navigation': 'Основная навигация',
  Language: 'Язык',
  'Saved on this device': 'Сохранено на этом устройстве',
  Startup: 'Загрузка',
  'Could not load solve history': 'Не удалось загрузить историю сборок',
  'Your saved history could not be opened. Retry to continue.':
    'Не удалось открыть сохранённую историю. Повторите попытку.',
  'Retry history': 'Загрузить историю снова',
  'Loading solve history…': 'Загрузка истории сборок…',
  'Current scramble': 'Текущий скрамбл',
  '3×3 scramble': 'Скрамбл 3×3',
  'Generating scramble…': 'Генерация скрамбла…',
  'Could not generate a scramble. Your saved solves are safe.':
    'Не удалось создать скрамбл. Сохранённые сборки в безопасности.',
  'Retry scramble': 'Создать скрамбл снова',
  'Scrambled cube': 'Перемешанный куб',
  'Waiting for scramble': 'Ожидание скрамбла',
  'State after the scramble': 'Состояние после скрамбла',
  'Saving on this device…': 'Сохранение на этом устройстве…',
  'Could not save your change. It is still held in memory. Retry before closing this page.':
    'Не удалось сохранить изменение. Оно осталось в памяти. Повторите попытку до закрытия страницы.',
  'Retry save': 'Сохранить снова',
  'The action could not be completed. Please try again when the timer is idle.':
    'Не удалось выполнить действие. Повторите попытку, когда таймер будет свободен.',
  Dismiss: 'Закрыть сообщение',
  'Recent solves': 'Последние сборки',
  Recent: 'Последние',
  'Total solves': 'Всего сборок',
  'newest first': 'сначала новые',
  'Has note': 'Есть заметка',
  'No solves yet. Take your time.':
    'Сборок пока нет. Начните, когда будете готовы.',
  'Hold Space · release to start · any key to stop':
    'Удерживайте пробел · отпустите для старта · любая клавиша для остановки',
  'Local-first speedcubing': 'Спидкубинг с локальным хранением',
  'Idle · Hold Space to get ready':
    'Ожидание · Удерживайте пробел для подготовки',
  'Idle · Waiting to start': 'Ожидание · Подготовка к старту',
  'Holding · Keep holding Space': 'Подготовка · Продолжайте удерживать пробел',
  'Ready · Release Space to start': 'Готово · Отпустите пробел для старта',
  'Running · Press any key to stop':
    'Сборка · Нажмите любую клавишу для остановки',
  'Stopped · Release the key': 'Остановлено · Отпустите клавишу',
  'Solve time': 'Время сборки',
  Statistics: 'Статистика',
  best: 'лучшее',
  mean: 'среднее',
  ao5: 'ao5',
  ao12: 'ao12',
  ao50: 'ao50',
  ao100: 'ao100',
  'Solve actions': 'Действия со сборкой',
  Result: 'Результат',
  Note: 'Заметка',
  Delete: 'Удалить',
  'Note for solve': 'Заметка к сборке',
  'Save note': 'Сохранить заметку',
  Cancel: 'Отмена',
  'Delete this solve? This cannot be undone.':
    'Удалить эту сборку? Это действие нельзя отменить.',
  'Confirm delete': 'Подтвердить удаление',
  'Characters used': 'Использовано символов',
  'Note is too long': 'Заметка слишком длинная',
  'Enlarge cube': 'Увеличить куб',
  'Cube after current scramble': 'Куб после текущего скрамбла',
  '3×3 cube after scramble': 'Куб 3×3 после скрамбла',
  Close: 'Закрыть',
  'Solve details': 'Подробности сборки',
  'Historical scramble': 'Скрамбл выбранной сборки',
  Penalty: 'Штраф',
  None: 'Нет',
} as const;

type TranslationKey = keyof typeof russian;
export type Language = 'ru' | 'en';
export const LANGUAGE_STORAGE_KEY = 'cubium.language';
const translate = (language: Language, key: TranslationKey): string =>
  language === 'ru' ? russian[key] : key;
const LanguageContext = createContext({
  language: 'ru' as Language,
  setLanguage: (language: Language) => {
    void language;
  },
  t: (key: TranslationKey) => translate('ru', key),
});

function readLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* Preference remains usable when browser storage is unavailable. */
    }
  }, [language]);
  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: (key) => translate(language, key) }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Provider and its typed consumer intentionally share this small context module.
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
