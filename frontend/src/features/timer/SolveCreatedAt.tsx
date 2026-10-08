import { useLanguage } from '../../app/i18n';

export function SolveCreatedAt({ createdAt }: { createdAt: string }) {
  const { language, t } = useLanguage();
  const formatted = new Intl.DateTimeFormat(
    language === 'ru' ? 'ru-RU' : 'en-US',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(new Date(createdAt));
  return (
    <p className="solve-created-at">
      {t('Created at')}: <time dateTime={createdAt}>{formatted}</time>
    </p>
  );
}
