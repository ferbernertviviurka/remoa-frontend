import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';

export default function Page() {
  return <EmptyState title={t('empty.editorial.title')} body={t('empty.editorial.body')} />;
}
