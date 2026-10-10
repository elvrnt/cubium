import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const russian = {
  Session: 'Сессия',
  'Manage sessions': 'Управление сессиями',
  'Create session': 'Создать сессию',
  'Session name': 'Название сессии',
  'Save session': 'Сохранить сессию',
  'Archived sessions': 'Архив сессий',
  Rename: 'Переименовать',
  Archive: 'В архив',
  Restore: 'Восстановить',
  Current: 'Текущая',
  Solves: 'Сборок',
  'Delete session?': 'Удалить сессию?',
  'Delete session': 'Удалить сессию',
  'The session and all its solves will be permanently deleted.':
    'Сессия и все её сборки будут удалены безвозвратно.',
  'Create another session before archiving or deleting this one.':
    'Сначала создайте другую сессию, чтобы архивировать или удалить эту.',
  'Use 1–80 characters; spaces at the edges are removed.':
    'От 1 до 80 символов; пробелы по краям удаляются.',
  'Could not change the session. Please try again.':
    'Не удалось изменить сессию. Повторите попытку.',
  'Close another Cubium tab to finish updating the database.':
    'Закройте другую вкладку Cubium, чтобы завершить обновление базы.',
  Results: 'Результаты',
  'Page not found': 'Страница не найдена',
  Showing: 'Показано',
  of: 'из',
  Range: 'Диапазон',
  'Last 100': 'Последние 100',
  'Last 500': 'Последние 500',
  'All solves': 'Все сборки',
  From: 'От',
  To: 'До',
  Reset: 'Сбросить',
  'Choose valid dates; the start must not be after the end.':
    'Укажите корректные даты: начало периода должно быть не позже окончания.',
  'Statistics for selected solves': 'Статистика выбранных сборок',
  'Averages use only the selected range; early points may not have enough solves.':
    'Средние учитывают только выбранный диапазон; у первых точек может не хватать сборок.',
  'Solve chart': 'График сборок',
  'Individual solves': 'Отдельные сборки',
  'Solve number': 'Номер сборки',
  Seconds: 'Секунды',
  'Use arrows to select a solve, Home/End for the edges and Enter for details.':
    'Стрелки выбирают сборку, Home/End переходят к краям, Enter открывает подробности.',
  'No numeric times in this range. DNF solves are shown in the separate band.':
    'В диапазоне нет числовых результатов. Сборки DNF показаны в отдельной полосе.',
  'Solve journal': 'Журнал сборок',
  Time: 'Время',
  Details: 'Подробнее',
  'Open solve': 'Открыть сборку',
  Previous: 'Назад',
  Next: 'Далее',
  Page: 'Страница',
  'Journal pages': 'Страницы журнала',
  'No solves match these filters.': 'По этим фильтрам сборок не найдено.',
  'Go to Timer': 'Перейти к таймеру',
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
  'Solve completed': 'Сборка завершена',
  'Result updated': 'Результат изменён',
  'Click the timer or use Tab to return': 'Вернитесь к таймеру: клик или Tab',
  'Last 20': 'Последние 20',
  'About statistics': 'О статистике',
  'Mean is the average of all completed times, including +2 and excluding DNF.':
    'Среднее — среднее время всех успешных сборок с учётом +2, без DNF.',
  'aoN is the average of the last N solves: ao5, ao12, ao50 and ao100 require at least 5, 12, 50 and 100 results respectively.':
    'aoN — среднее последних N сборок: для ao5, ao12, ao50 и ao100 нужно минимум 5, 12, 50 и 100 результатов соответственно.',
  '— means there is not enough data yet. Averages exclude the best and worst results; if a DNF remains, the average is DNF.':
    '— означает, что данных пока недостаточно. Из среднего aoN исключаются лучшие и худшие результаты; если среди оставшихся есть DNF, среднее тоже DNF.',
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
  'Created at': 'Дата и время',
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
