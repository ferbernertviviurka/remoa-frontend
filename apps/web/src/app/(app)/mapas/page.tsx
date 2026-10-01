import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { EmptyState } from '@/features/shell/empty-state';

export default function Page() {
  return (
    <EmptyState title={t('empty.boards.title')} body={t('empty.boards.body')}>
      <Button disabled>{t('empty.boards.import')}</Button>
      <Button variant="secondary" disabled>{t('empty.boards.template')}</Button>
    </EmptyState>
  );
}
