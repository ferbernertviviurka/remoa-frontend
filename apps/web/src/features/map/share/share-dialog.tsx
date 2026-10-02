'use client';

// F17 T7: ShareDialog (FR-12). Owner-only dialog in the editor header.
// D-320: dialog loads share state on open (useEffect) to avoid stale data.
// D-326: "Gerar novo link" confirmation is an inline state (no extra Dialog).

import { useEffect, useRef, useState } from 'react';
import type { Board } from '@remoa/contracts';
import { SHARE_PASSWORD_MIN, SHARE_PASSWORD_MAX, sharePasswordSchema, updateShareInputSchema } from '@remoa/contracts';
import type { BoardAccess, ShareState } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, CopyField, Dialog, PasswordInput, Segmented, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { getShare, updateShare } from './share-api';

type Props = {
  board: Pick<Board, 'id' | 'access' | 'shareUrl'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const accessOptions = [
  { value: 'owner', label: t('boardsAccess.owner') },
  { value: 'password', label: t('boardsAccess.password') },
  { value: 'public', label: t('boardsAccess.public') },
] as const;

const accessDescs: Record<BoardAccess, string> = {
  owner: t('boardsAccess.ownerDesc'),
  password: t('boardsAccess.passwordDesc'),
  public: t('boardsAccess.publicDesc'),
};

/** FR-12: "Compartilhar" dialog — access segmented, optional password, copy link, rotate. */
export function ShareDialog({ board, open, onOpenChange }: Props) {
  const { toast } = useToast();

  // server state
  const [shareState, setShareState] = useState<ShareState | null>(null);
  const [loading, setLoading] = useState(false);

  // form state
  const [access, setAccess] = useState<BoardAccess>(board.access);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saveError, setSaveError] = useState('');

  // rotate confirmation
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotateError, setRotateError] = useState('');
  const [rotating, setRotating] = useState(false);

  // saving
  const [saving, setSaving] = useState(false);

  const prevAccess = useRef<BoardAccess>(board.access);

  // Load share state on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaveError('');
    setRotateError('');
    setConfirmRotate(false);
    setPassword('');
    setPasswordError('');
    getShare(board.id).then((r) => {
      setLoading(false);
      if (r.ok) {
        setShareState(r.data);
        setAccess(r.data.access);
        prevAccess.current = r.data.access;
      }
    });
  }, [open, board.id]);

  const passwordRequired = access === 'password' && shareState?.access !== 'password';

  function handleAccessChange(v: string) {
    const next = v as BoardAccess;
    setAccess(next);
    setSaveError('');
    if (next !== 'password') {
      setPassword('');
      setPasswordError('');
    }
  }

  function validatePassword(): boolean {
    if (access !== 'password') return true;
    // new password required when switching to password
    if (passwordRequired && !password) {
      setPasswordError(t('newMapAbout.passwordRequired'));
      return false;
    }
    // if user entered a password (optional for existing), validate length
    if (password) {
      const r = sharePasswordSchema.safeParse(password);
      if (!r.success) {
        setPasswordError(
          t('newMapAbout.passwordHint'),
        );
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (!validatePassword()) return;
    setSaving(true);
    setSaveError('');

    const body = updateShareInputSchema.safeParse({
      access,
      ...(access === 'password' && password ? { password } : {}),
    });

    if (!body.success) {
      setSaving(false);
      setSaveError(t('share.saveError'));
      return;
    }

    const from = prevAccess.current;
    const r = await updateShare(board.id, body.data);
    setSaving(false);

    if (!r.ok) {
      if (r.error.code === 'conflict') {
        // 409: reload state
        const reload = await getShare(board.id);
        if (reload.ok) {
          setShareState(reload.data);
          setAccess(reload.data.access);
          prevAccess.current = reload.data.access;
        }
      }
      setSaveError(t('share.saveError'));
      return;
    }

    setShareState(r.data);
    prevAccess.current = r.data.access;
    setPassword('');
    setPasswordError('');
    track('board_access_changed', { from, to: r.data.access, source: 'editor' });
    if (access === 'password' && password) {
      track('board_share_password_changed', {});
    }
  }

  async function handleRotate() {
    setRotating(true);
    setRotateError('');
    const r = await updateShare(board.id, { access, rotate: true });
    setRotating(false);
    setConfirmRotate(false);
    if (!r.ok) {
      setRotateError(t('share.rotateError'));
      return;
    }
    setShareState(r.data);
    track('board_share_rotated', {});
  }

  const url = shareState?.url ?? null;
  const copies = shareState?.copies ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('share.title')}
      description={undefined}
      closeLabel={t('common.close')}
      size="md"
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted" role="status" aria-label={t('common.loading')}>
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Access segmented */}
          <div className="flex flex-col gap-2">
            <Segmented
              aria-label={t('boardsAccess.owner')}
              options={accessOptions}
              value={access}
              onValueChange={handleAccessChange}
            />
            <p className="m-0 text-sm text-muted" role="status">
              {accessDescs[access]}
            </p>
          </div>

          {/* Password field (Privado only) */}
          {access === 'password' ? (
            <div className="flex flex-col gap-1">
              {shareState?.access === 'password' && !passwordRequired ? (
                <p className="m-0 text-sm text-muted">{t('share.passwordCurrentHidden')}</p>
              ) : null}
              <PasswordInput
                label={t('share.newPasswordLabel')}
                showAriaLabel={t('newMapAbout.passwordShowAriaLabel')}
                hideAriaLabel={t('newMapAbout.passwordHideAriaLabel')}
                autocomplete="new-password"
                minLength={SHARE_PASSWORD_MIN}
                maxLength={SHARE_PASSWORD_MAX}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                error={passwordError || undefined}
                hint={t('newMapAbout.passwordHint')}
                aria-required={passwordRequired}
              />
            </div>
          ) : null}

          {/* Link field (when url exists and access is not owner) */}
          {url && access !== 'owner' ? (
            <div className="flex flex-col gap-2">
              <CopyField
                value={url}
                label={t('share.linkFieldLabel')}
                copyLabel={t('share.copyLabel')}
                copiedLabel={t('share.copiedLabel')}
                onCopied={() => toast({ title: t('share.copyToast') })}
              />

              {/* Rotate link */}
              {confirmRotate ? (
                <div
                  className="rounded-[14px] border border-border bg-canvas p-3 flex flex-col gap-2"
                  role="alert"
                >
                  <p className="m-0 text-sm text-ink">{t('share.rotateLinkConfirm')}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleRotate}
                      aria-busy={rotating}
                    >
                      {rotating ? t('common.loading') : t('share.rotateLinkConfirmCta')}
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => setConfirmRotate(false)}>
                      {t('share.rotateLinkCancel')}
                    </Button>
                  </div>
                  {rotateError ? (
                    <p className="m-0 text-sm text-review" role="alert">{rotateError}</p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRotate(true)}
                  className="self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('share.rotateLink')}
                </button>
              )}

              {/* Copies count (FR-20) */}
              <p className="m-0 text-sm text-muted">{t('share.copies', { n: copies })}</p>
            </div>
          ) : null}

          {/* Responsibility warning */}
          <p className="m-0 text-sm text-muted">{t('share.responsibility')}</p>

          {/* Error */}
          {saveError ? (
            <p className="m-0 text-sm text-review" role="alert">{saveError}</p>
          ) : null}

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={() => void handleSave()} aria-busy={saving}>
              {t('share.save')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
