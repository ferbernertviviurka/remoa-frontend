import { t } from '@remoa/strings';

export default function Loading() {
  return <p role="status" className="py-20 text-center text-muted">{t('plans.success.verifying')}</p>;
}
