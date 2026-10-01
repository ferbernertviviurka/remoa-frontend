import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';

export default function Page() {
  return <EmptyState title={t('empty.coverage.title')} body={t('empty.coverage.body')} />;
}
