'use client';

import { useNavigate } from '@/features/shell/use-navigate';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { signOut } from '@/server/auth/actions';

export function SignOutButton() {
  const [navigating, router] = useNavigate();
  return (
    <Button
      variant="secondary"
      loading={navigating}
      loadingLabel={t('common.loading')}
      onClick={async () => {
        const res = await signOut();
        if (res.ok) {
          router.push('/');
          router.refresh();
        }
      }}
    >
      {t('auth.signOut')}
    </Button>
  );
}
