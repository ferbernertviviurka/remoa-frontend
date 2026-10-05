'use client';

import { useEffect, useState } from 'react';
import { NOTIFICATION_PREFS, notificationPrefKeys, reviewReminderTimes, type NotificationPrefKey, type NotificationPrefs, type ReviewReminderTime } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, NotificationPrefsTable, PauseRemindersRow, ReminderTimeChoice, SkeletonBlock, SkeletonRegion, useToast, type PrefRow } from '@remoa/ui';
import { getPrefs, patchPrefs } from '../api';
import { notifTrack } from '../telemetry';

const ROW_TEXT = {
  calendar_d1: 'calendarD1', calendar_d0: 'calendarD0', review_reminder: 'review', map_ready: 'mapReady', inactivity: 'inactivity', referral: 'referral', support: 'support', account_billing: 'account', store: 'store',
} as const satisfies Record<NotificationPrefKey, string>;

export const rowsOf = (p: NotificationPrefs): PrefRow[] =>
  notificationPrefKeys.map((key) => {
    const d = NOTIFICATION_PREFS[key];
    const k = ROW_TEXT[key];
    return {
      id: key,
      title: t(`notifications.prefs.row.${k}.title`),
      description: t(`notifications.prefs.row.${k}.text`),
      app: d.inApp === 'none' ? null : p.matrix[key].inApp,
      email: p.matrix[key].email,
      emailLocked: d.email === 'fixed',
      muted: p.pauseReminders && d.pausable,
    };
  });

/** F26 FR-6 "Como avisar você": one source of preferences (GET/PATCH /v1/notifications/prefs); every change saves at once. */
export function PrefsPanel() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setFailed(false);
    const r = await getPrefs().catch(() => null);
    if (r?.ok) setPrefs(r.data);
    else setFailed(true);
  };
  useEffect(() => void load(), []);

  /** Optimistic: apply, PATCH, revert on failure; a quiet toast confirms. */
  async function save(patch: Parameters<typeof patchPrefs>[0], apply: (p: NotificationPrefs) => NotificationPrefs) {
    const prev = prefs;
    if (!prev) return;
    setPrefs(apply(prev));
    const r = await patchPrefs(patch).catch(() => null);
    if (r?.ok) {
      setPrefs(r.data);
      toast({ title: t('notifications.prefs.saved') });
    } else {
      setPrefs(prev);
      toast({ title: t('notifications.prefs.saveError') });
    }
  }

  return (
    <section id="preferencias" aria-labelledby="prefs-title" className="flex scroll-mt-24 flex-col gap-3 rounded-list border border-border bg-surface px-5 py-6 md:px-6">
      <h2 id="prefs-title" className="m-0 font-display text-2xl font-extrabold tracking-[-0.025em]">{t('notifications.prefs.title')}</h2>
      <p className="m-0 text-muted">{t('notifications.prefs.intro')}</p>
      {prefs ? (
        <>
          <PauseRemindersRow
            title={t('notifications.prefs.pauseTitle')}
            description={t('notifications.prefs.pauseText')}
            checked={prefs.pauseReminders}
            onCheckedChange={(on) => {
              notifTrack.pauseToggled(on);
              void save({ pauseReminders: on }, (p) => ({ ...p, pauseReminders: on }));
            }}
          />
          <NotificationPrefsTable
            rows={rowsOf(prefs)}
            typeHeader={t('notifications.prefs.type')}
            appHeader={t('notifications.prefs.app')}
            emailHeader={t('notifications.prefs.email')}
            notApplicableLabel={t('notifications.prefs.notApplicable')}
            lockedLabel={t('notifications.prefs.locked')}
            lockedHint={t('notifications.prefs.lockedHint')}
            cellLabel={(title, ch) => t(ch === 'app' ? 'notifications.prefs.cellApp' : 'notifications.prefs.cellEmail', { title })}
            onChange={(id, ch, value) => {
              const key = id as NotificationPrefKey;
              const channel = ch === 'app' ? 'inApp' : 'email';
              notifTrack.prefChanged(key, ch === 'app' ? 'in_app' : 'email', value);
              void save({ pref: { key, channel, value } }, (p) => ({ ...p, matrix: { ...p.matrix, [key]: { ...p.matrix[key], [channel]: value } } }));
            }}
          />
          <ReminderTimeChoice
            title={t('notifications.prefs.timeTitle')}
            groupLabel={t('notifications.prefs.timeGroup')}
            note={t('notifications.prefs.timeNote')}
            options={reviewReminderTimes}
            value={prefs.reviewReminderTime}
            onChange={(v) => void save({ reviewReminderTime: v as ReviewReminderTime }, (p) => ({ ...p, reviewReminderTime: v as ReviewReminderTime }))}
          />
          <p className="m-0 text-[12.5px] text-muted">{t('notifications.prefs.footnote')}</p>
        </>
      ) : failed ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <span>{t('notifications.prefs.loadError')}</span>
          <Button variant="secondary" size="sm" onClick={() => void load()}>{t('notifications.page.retry')}</Button>
        </div>
      ) : (
        <SkeletonRegion label={t('notifications.page.loading')}><SkeletonBlock height={480} radius={18} /></SkeletonRegion>
      )}
    </section>
  );
}
