import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-6">
      <nav aria-label={t('shell.header.breadcrumbLabel')} className="min-w-0 truncate text-sm font-semibold text-text">
        {t('shell.header.breadcrumbRoot')}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <Button disabled>{t('shell.header.import')}</Button>
      </div>
    </header>
  );
}
