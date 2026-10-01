import { t } from '@remoa/strings';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { EmptyState } from '@/features/shell/empty-state';
import { requireUser } from '@/server/auth/session';

export default async function Page() {
  const user = await requireUser();
  return (
    <EmptyState title={t('empty.account.title')} body={t('empty.account.body')}>
      <p className="w-full text-sm font-semibold text-text">{user.email}</p>
      <SignOutButton />
    </EmptyState>
  );
}
