'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { StudyProfile } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Button, useToast } from '@remoa/ui';
import { confirmStudyProfile, saveStudyProfile, suggestReference } from '@/features/study-profile/api';
import { courseName, focusTitle, fromProfile, newSuggestions, studyCompleteness, validateDraft, visibleFields, type StudyDraft, type StudyErrors } from '@/features/study-profile/autofill';
import { useCourses, useGoals } from '@/features/study-profile/reference';
import { StudyFields } from '@/features/study-profile/study-fields';
import { publishStudyProfile, useStudyProfile } from '@/features/study-profile/use-study-profile';
import { useBankStudentOpen } from '@/features/exam-builder/train-topic-link';
import { useAccount } from '../shell/account-context';
import { SectionCard as Card } from '../shared/section-card';
import { useOnline } from '../shell/use-online';
import { TimezoneRow } from './timezone-row';

const t = withStrings({ studyProfile: more.studyProfile });
const shortcut = 'inline-flex min-h-11 items-center rounded-[13px] px-[18px] text-sm font-extrabold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** F35 FR-23..FR-25: Conta > Perfil > "Seu estudo" — focus card, shortcuts by profile, "Cadastro de estudo" list and inline edit. */
export function StudySection({ openEditor = false }: { openEditor?: boolean }) {
  const { account, setAccount } = useAccount();
  const shared = useStudyProfile();
  const { toast } = useToast();
  const online = useOnline();
  const bankOpen = useBankStudentOpen();
  const courses = useCourses();
  const allGoals = useGoals();
  // /me already brings the profile (CCR-160b); the shared read covers old snapshots and later publishes.
  const profile: StudyProfile | null = shared.loaded || account.studyProfile === undefined ? shared.profile : account.studyProfile;
  const caps = shared.loaded || !account.capabilities ? shared.capabilities : account.capabilities;
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<StudyDraft>(() => fromProfile(profile, courses));
  const [errors, setErrors] = useState<StudyErrors>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function open() {
    setDraft(fromProfile(profile, courses));
    setErrors({});
    setEdit(true);
  }
  useEffect(() => {
    if (!openEditor) return;
    open();
    requestAnimationFrame(() => ref.current?.scrollIntoView?.({ block: 'start' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link opens once
  }, [openEditor]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const { errors: found, input } = validateDraft(draft, 'profile');
    setErrors(found);
    if (!input) return;
    setBusy(true);
    const send = !profile || profile.source === 'migration' ? confirmStudyProfile : saveStudyProfile; // FR-46: confirming turns source into 'profile'
    const r = await send(input).catch(() => null);
    setBusy(false);
    if (!r?.ok) return toast({ title: t('studyProfile.account.saveError'), tone: 'danger' });
    for (const s of newSuggestions(input, profile)) void suggestReference(s).catch(() => null); // FR-6: never blocks
    publishStudyProfile(r.data); // FR-25: menu, shortcuts and banner update at once
    setAccount((p) => ({ ...p, studyProfile: r.data.profile, capabilities: r.data.capabilities }));
    toast({ title: t('studyProfile.account.saved') });
    setEdit(false);
  }

  const view = fromProfile(profile, courses);
  const show = visibleFields(view);
  const confirmed = !!profile && profile.source !== 'migration' && !!profile.course;
  const goalNames = [...(profile?.goals ?? []).map((g) => allGoals.find((x) => x.code === g)?.name ?? g), ...(profile?.customGoals ?? [])];
  const name = courseName(view);
  const instLine = profile?.institution ? profile.institution.name : (profile?.institutionText ?? '');
  const place = view.city ? `${view.city}${view.uf ? `, ${view.uf}` : ''}` : '';
  const empty = t('studyProfile.summary.empty');
  const chips = [
    confirmed && profile?.course !== 'not_health' ? name : null,
    confirmed && show.period ? t('studyProfile.period.value', { n: view.period }) : null,
    profile?.institution?.acronym ?? (instLine || null),
    profile?.institution ? t(`studyProfile.institution.${profile.institution.type}`) : null,
    confirmed ? view.council : null,
  ].filter((c): c is string => !!c);
  const rows: [string, string][] = [
    [t('studyProfile.summary.situation'), confirmed && profile?.situation ? t(`studyProfile.situationShort.${profile.situation}`) : empty],
    [t('studyProfile.summary.course'), confirmed ? name : empty],
    [t('studyProfile.summary.period'), confirmed && show.period ? t('studyProfile.period.value', { n: view.period }) : empty],
    [t('studyProfile.summary.institution'), instLine ? `${instLine}${place ? ` · ${place}` : ''}` : empty],
    [t('studyProfile.summary.council'), confirmed && view.council ? `${view.council}${profile?.councilNumber ? ` · ${profile.councilNumber}` : ''}` : empty],
    [t('studyProfile.summary.goals'), goalNames.length ? goalNames.join(', ') : empty],
  ];
  const pct = studyCompleteness(confirmed ? profile : profile && { ...profile, situation: null, course: null });

  return (
    <div ref={ref} className="scroll-mt-24">
      <Card
        title={t('studyProfile.title')}
        body={t('studyProfile.account.body')}
        action={
          <Button variant="secondary" aria-expanded={edit} onClick={() => (edit ? setEdit(false) : open())}>
            {t(edit ? 'studyProfile.account.closeEdit' : 'studyProfile.account.edit')}
          </Button>
        }
      >
        <div className="flex flex-col gap-2 rounded-hero bg-panel-dark p-5 text-on-dark md:p-6">
          <span className="text-xs font-extrabold tracking-[.12em] text-on-dark-muted">{t('studyProfile.account.focusEyebrow')}</span>
          <span className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-0.03em] md:text-[30px]">{goalNames.length ? goalNames.join(' · ') : t('studyProfile.focus.noGoal')}</span>
          <span className="text-base text-on-dark-muted-2">{confirmed ? focusTitle(view) : t('studyProfile.focus.empty')}</span>
          {chips.length ? (
            <span className="mt-1 flex flex-wrap gap-2">
              {chips.map((c) => <span key={c} className="rounded-pill bg-white/[.14] px-3 py-[5px] text-[13px] font-semibold">{c}</span>)}
            </span>
          ) : null}
          <nav aria-label={t('studyProfile.account.shortcuts')} className="mt-2.5 flex flex-wrap gap-2.5">
            {caps.showEnamed ? <Link href="/app/cobertura" className={`${shortcut} bg-white text-panel-dark`}>{t('studyProfile.account.openEnamed')}</Link> : null}
            {bankOpen && confirmed && profile?.course !== 'not_health' ? (
              <Link href="/app/banco-de-questoes/prova" className={`${shortcut} bg-white/[.14] text-on-dark`}>{t('studyProfile.account.createExam', { course: name })}</Link>
            ) : null}
            <Link href="/app/mapas/novo" className={`${shortcut} bg-white/[.14] text-on-dark`}>{t('studyProfile.account.newMap')}</Link>
          </nav>
        </div>

        <div className="mt-[18px] flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-1.5">
            <span className="text-[15px] font-extrabold">{t('studyProfile.account.register')}</span>
            <span className="text-[13px] font-bold text-muted">{t('studyProfile.account.registerPct', { pct })}</span>
          </div>
          <dl className="m-0">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-x-4 gap-y-1 border-t border-divider py-3 sm:grid-cols-[190px_minmax(0,1fr)]">
                <dt className="font-semibold text-muted">{k}</dt>
                <dd className="m-0 min-w-0 break-words font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {edit ? (
          <form onSubmit={save} noValidate className="mt-4 flex max-w-[640px] flex-col gap-5 border-t border-divider pt-5">
            <StudyFields value={draft} onChange={setDraft} errors={errors} disabled={busy} />
            <span>
              <Button type="submit" loading={busy} disabled={!online}>{t('studyProfile.account.save')}</Button>
            </span>
          </form>
        ) : null}
        <TimezoneRow />
      </Card>
    </div>
  );
}
