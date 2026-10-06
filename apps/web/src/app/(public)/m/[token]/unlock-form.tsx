'use client';

// F17 T7 (FR-14): locked board password form.
// A11y: PasswordInput has real label, autocomplete=current-password, error announced via aria.
import { useState, useTransition } from 'react';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, PasswordInput } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { unlockBoardAction } from './actions';

const t = withStrings({ newMapAbout: more.newMapAbout, sharedMap: more.sharedMap });

type Props = { token: string };

/** Renders the "Mapa protegido por senha" screen (FR-14). */
export function UnlockForm({ token }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError('');
    startTransition(async () => {
      const result = await unlockBoardAction(token, password);
      if (result.ok) {
        // Server revalidated the path; page re-renders via router.
        // Clear sensitive value from state.
        setPassword('');
        track('shared_board_unlocked', {});
        return;
      }
      if (result.error === 'too_many_attempts') {
        setError(t('sharedMap.tooManyAttempts'));
        track('shared_board_unlock_failed', {});
        return;
      }
      if (result.error === 'not_found') {
        setError(t('sharedMap.notFoundTitle'));
        return;
      }
      setError(t('sharedMap.wrongPassword'));
      track('shared_board_unlock_failed', {});
    });
  }

  return (
    <div
      className="flex w-full max-w-sm flex-col gap-6 rounded-[24px] border border-border bg-surface p-8 shadow-lift"
      data-testid="unlock-form"
    >
      <h1 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.025em]">
        {t('sharedMap.lockedTitle')}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <PasswordInput
          label={t('sharedMap.passwordLabel')}
          showAriaLabel={t('newMapAbout.passwordShowAriaLabel')}
          hideAriaLabel={t('newMapAbout.passwordHideAriaLabel')}
          autocomplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          error={error || undefined}
          aria-required="true"
        />

        <div className="w-full [&>button]:w-full">
          <Button type="submit" aria-busy={isPending}>
            {isPending ? t('sharedMap.unlocking') : t('sharedMap.unlockCta')}
          </Button>
        </div>
      </form>
    </div>
  );
}
