'use client';

import { useState } from 'react';
import { PLAN_LIMITS, REMINDER_HOURS, type Preferences, type UpdatePreferencesInput } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, ChoiceChip, NumberStepper, Segmented, Switch, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { SectionCard, SettingRow } from '../shared/section-card';
import { useAccount } from '../shell/account-context';
import { applyMotion, useMotionSync } from './motion';

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}h`;

export function PreferencesSection() {
  const { account, setAccount } = useAccount();
  const { toast } = useToast();
  const prefs = account.preferences;
  const pro = account.entitlements.plan === 'pro';
  const cap = pro ? PLAN_LIMITS.pro.newCardsPerDay : PLAN_LIMITS.free.newCardsPerDay;
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState(false);
  useMotionSync(prefs.reduceMotion);

  /** Optimistic: apply, PATCH, revert on failure. `saved` is the confirmation shown on success. */
  async function save(patch: UpdatePreferencesInput, saved: string) {
    const prev = account.preferences;
    const apply = (p: Partial<Preferences>) => setAccount((a) => ({ ...a, preferences: { ...a.preferences, ...p } }));
    setError(false);
    apply(patch as Partial<Preferences>);
    if ('reduceMotion' in patch) applyMotion(patch.reduceMotion ?? null);
    const revert = () => {
      apply(prev);
      applyMotion(prev.reduceMotion);
      setError(true);
    };
    try {
      const r = await api<Preferences>('/v1/account/preferences', { method: 'PATCH', body: JSON.stringify(patch) });
      if (!r.ok) return revert();
      apply(r.data);
    } catch {
      return revert();
    }
    for (const [key, value] of Object.entries(patch)) track('preference_changed', { key: key as keyof Preferences, value: value as boolean | number | Preferences['theme'] | null });
    if ('reminderEnabled' in patch && patch.reminderEnabled) track('reminder_enabled', { hour: prefs.reminderHour });
    toast({ title: saved });
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="review" role="alert" title={t('account.prefs.saveError')} /> : null}

      <SectionCard title={t('account.prefs.appearanceTitle')} body={t('account.prefs.appearanceBody')}>
        <SettingRow title={t('account.prefs.theme')} body={t('account.prefs.themeHelp')}>
          {/* Q-021: "Escuro" hidden while tokens.css only keeps the v1 dark theme functional. */}
          <Segmented
            aria-label={t('account.prefs.theme')}
            value={prefs.theme === 'dark' ? 'light' : prefs.theme}
            onValueChange={(v) => void save({ theme: v as 'light' | 'system' }, t('account.prefs.saved'))}
            options={[
              { value: 'light', label: t('account.prefs.themeOptions.light') },
              { value: 'system', label: t('account.prefs.themeOptions.system') },
            ]}
          />
        </SettingRow>
        <SettingRow title={t('account.prefs.reduceMotion')} body={t('account.prefs.reduceMotionHelp')}>
          <Switch
            size="lg"
            hideLabel
            label={t('account.prefs.reduceMotion')}
            checked={prefs.reduceMotion === true}
            onCheckedChange={(c) => void save({ reduceMotion: c }, t(c ? 'account.prefs.reduceMotionOn' : 'account.prefs.reduceMotionOff'))}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title={t('account.prefs.routineTitle')} body={t('account.prefs.routineBody')}>
        <SettingRow title={t('account.prefs.reminder')} body={t('account.prefs.reminderHelp')}>
          <Switch
            size="lg"
            hideLabel
            label={t('account.prefs.reminder')}
            checked={prefs.reminderEnabled}
            onCheckedChange={(c) => void save({ reminderEnabled: c }, t(c ? 'account.prefs.reminderOn' : 'account.prefs.reminderOff', { hour: hourLabel(prefs.reminderHour) }))}
          />
        </SettingRow>
        {prefs.reminderEnabled ? (
          <div className="slide pb-4">
            <ChoiceChip
              label={t('account.prefs.reminderHour')}
              value={String(prefs.reminderHour)}
              onValueChange={(v) => void save({ reminderHour: Number(v) as Preferences['reminderHour'] }, t('account.prefs.reminderHourSaved', { hour: hourLabel(Number(v)) }))}
              options={REMINDER_HOURS.map((h) => ({ value: String(h), label: hourLabel(h) }))}
            />
          </div>
        ) : null}
        <SettingRow title={t('account.prefs.newPerDay')} body={t(pro ? 'account.prefs.newPerDayPro' : 'account.prefs.newPerDayFree')}>
          <NumberStepper
            label={t('account.prefs.newPerDay')}
            value={prefs.newCardsPerDay}
            min={5}
            max={cap}
            step={5}
            decLabel={t('account.prefs.newPerDayDown')}
            incLabel={t('account.prefs.newPerDayUp')}
            onChange={(n) => {
              setNudge(false);
              void save({ newCardsPerDay: n }, t('account.prefs.newPerDaySaved', { n }));
            }}
            onLimit={() => !pro && setNudge(true)}
          />
        </SettingRow>
        {nudge ? <Alert tone="watch" title={t('account.prefs.newPerDayProNudge')} /> : null}
      </SectionCard>

      <SectionCard title={t('account.prefs.emailsTitle')} body={t('account.prefs.emailsBody')}>
        <SettingRow title={t('account.prefs.emailReview')} body={t('account.prefs.emailReviewHelp')}>
          <Switch size="lg" hideLabel label={t('account.prefs.emailReview')} checked={prefs.emailReviewReminders} onCheckedChange={(c) => void save({ emailReviewReminders: c }, t('account.prefs.saved'))} />
        </SettingRow>
        <SettingRow title={t('account.prefs.emailNews')} body={t('account.prefs.emailNewsHelp')}>
          <Switch size="lg" hideLabel label={t('account.prefs.emailNews')} checked={prefs.emailProductNews} onCheckedChange={(c) => void save({ emailProductNews: c }, t('account.prefs.saved'))} />
        </SettingRow>
      </SectionCard>
    </div>
  );
}
