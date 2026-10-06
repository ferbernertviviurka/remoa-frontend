import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ plans: more.plans });

export default function Loading() {
  return <p role="status" className="py-20 text-center text-muted">{t('plans.success.verifying')}</p>;
}
