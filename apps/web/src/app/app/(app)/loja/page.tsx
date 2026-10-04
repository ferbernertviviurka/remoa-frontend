import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';

export default function Page() {
  return <EmptyState title={t('empty.store.title')} body={t('empty.store.body')} />;
}
