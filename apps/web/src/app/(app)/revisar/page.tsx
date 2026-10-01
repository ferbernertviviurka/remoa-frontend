import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';

export default function Page() {
  return <EmptyState title={t('empty.review.title')} body={t('empty.review.body')} />;
}
