'use client';

import { useRouter } from 'next/navigation';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';
import { signOut } from '@/server/auth/actions';

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
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
