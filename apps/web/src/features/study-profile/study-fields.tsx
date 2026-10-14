'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { HealthCourse, Institution, StudyGoalCode } from '@remoa/contracts';
import { MAX_GOALS } from '@remoa/contracts/constants';
import { STUDY_PROFILE_LIMITS, profileCapabilities, studySituations } from '@remoa/contracts/study-profile-core'; // zod-free (D-1864)
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Autocomplete, type AutocompleteOption, Button, ChoiceChip, ChoiceChipMulti, Input, NumberStepper } from '@remoa/ui';
import { searchInstitutions } from './api';
import { applyCourse, applyInstitution, courseName, toggleGoal, undoAutoGoal, visibleFields, type StudyDraft, type StudyErrors } from './autofill';
import { useCourses, useGoals } from './reference';

const t = withStrings({ studyProfile: more.studyProfile });
const CUSTOM = 'custom:';

const instLabel = (i: Pick<Institution, 'name' | 'acronym'>) => (i.acronym && !i.name.includes(`(${i.acronym})`) ? `${i.name} (${i.acronym})` : i.name);
export const courseOption = (c: HealthCourse): AutocompleteOption => ({ value: c.code, label: c.name, description: c.councilCode ?? undefined, keywords: c.aliases });
/** Fallback when the course list did not load: "Usar o que digitei" still works. */
const OTHER: HealthCourse = { code: 'other_health', name: '', aliases: [], kind: 'other_health', councilCode: null, suggestedGoals: [] };

function Err({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} role="alert" className="m-0 text-sm font-semibold text-review-text">{children}</p> : null;
}
const help = 'm-0 text-[13px] text-muted';
const autoBox = 'flex flex-col gap-1.5 rounded-field border border-border bg-primary-tint px-4 py-3 text-sm text-primary-deep';

/** F35 FR-14..FR-22: the "Seu estudo" fields, shared by signup step 2, the onboarding and Conta. Controlled: `value` + `onChange`. */
/** `askCouncilNumber` false (signup, D-1862): the optional council number is only asked in Conta, never sent through auth metadata. */
export function StudyFields({ value: d, onChange, errors = {}, disabled, askCouncilNumber = true }: { value: StudyDraft; onChange: (d: StudyDraft) => void; errors?: StudyErrors; disabled?: boolean; askCouncilNumber?: boolean }) {
  const id = useId();
  const courses = useCourses();
  const listed = useGoals(d.course);
  const all = useGoals();
  const insts = useRef(new Map<string, Institution>());
  const show = visibleFields(d);
  // A form opened before the course list arrived (saved profile, restored draft) gets the list's name and council once it does.
  const known = courses.find((c) => c.code === d.course);
  useEffect(() => {
    if (!known) return;
    const label = d.course === 'other_health' && d.courseOtherText ? d.courseLabel : known.name;
    if (known.councilCode !== d.council || label !== d.courseLabel) onChange({ ...d, council: known.councilCode, courseLabel: label });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the list or the course changes
  }, [known]);
  const goalName = (g: StudyGoalCode) => listed.find((x) => x.code === g)?.name ?? all.find((x) => x.code === g)?.name ?? t(`studyProfile.goals.names.${g}`);
  const [otherGoal, setOtherGoal] = useState('');

  function pickCourse(v: { value: string | null; label: string; custom?: boolean } | null) {
    if (!v) return onChange(applyCourse(d, null, ''));
    if (v.custom || v.value === null) return onChange(applyCourse(d, courses.find((c) => c.code === 'other_health') ?? OTHER, v.label.trim()));
    onChange(applyCourse(d, courses.find((c) => c.code === v.value) ?? null, v.label));
  }
  function pickInstitution(v: { value: string | null; label: string; custom?: boolean } | null) {
    const inst = v?.value ? insts.current.get(v.value) : undefined;
    onChange(applyInstitution(d, !v ? null : inst ? { institution: inst } : { text: v.label.trim().slice(0, STUDY_PROFILE_LIMITS.institutionText) }));
  }
  async function loadInstitutions(q: string, signal: AbortSignal): Promise<AutocompleteOption[]> {
    const r = await searchInstitutions(q, undefined, signal);
    if (!r.ok) return [];
    for (const i of r.data) insts.current.set(i.id, i);
    return r.data.map((i) => ({ value: i.id, label: instLabel(i), description: `${i.city}, ${i.uf}`, keywords: i.acronym ? [i.acronym] : [] }));
  }

  const goalValues = [...d.goals, ...d.customGoals.map((g) => CUSTOM + g)];
  // G29: every goal is a chip with its human name; the course's suggestions come first, in their own group.
  const suggestedCodes = known?.suggestedGoals ?? [];
  const pool = [...new Set<StudyGoalCode>([...suggestedCodes, ...listed.map((g) => g.code), ...d.goals])];
  const chip = (g: StudyGoalCode) => ({ value: g, label: goalName(g) });
  const goalGroups = [
    { key: 'suggested', title: suggestedCodes.length ? t('studyProfile.goals.suggested', { course: known?.name ?? '' }) : '', options: pool.filter((g) => suggestedCodes.includes(g)).map(chip) },
    { key: 'more', title: t(suggestedCodes.length ? 'studyProfile.goals.more' : 'studyProfile.goals.all'), options: pool.filter((g) => !suggestedCodes.includes(g)).map(chip) },
    { key: 'custom', title: t('studyProfile.goals.custom'), options: d.customGoals.map((g) => ({ value: CUSTOM + g, label: g })) },
  ].filter((g) => g.options.length);
  function setGoals(vs: string[]) {
    const removed = goalValues.find((v) => !vs.includes(v));
    const added = vs.find((v) => !goalValues.includes(v));
    const changed = removed ?? added;
    if (!changed) return;
    if (changed.startsWith(CUSTOM)) onChange({ ...d, customGoals: d.customGoals.filter((g) => CUSTOM + g !== changed) });
    else onChange(toggleGoal(d, changed as StudyGoalCode));
  }
  const goalCount = d.goals.length + d.customGoals.length;
  const otherText = otherGoal.trim().replace(/\s+/g, ' ').slice(0, STUDY_PROFILE_LIMITS.customGoal);
  const canAddOther = otherText.length >= 2 && !d.customGoals.includes(otherText) && d.customGoals.length < STUDY_PROFILE_LIMITS.customGoals && goalCount < MAX_GOALS;
  function addOtherGoal() {
    if (!canAddOther) return;
    onChange({ ...d, customGoals: [...d.customGoals, otherText] });
    setOtherGoal('');
  }

  const caps = profileCapabilities(d.course ? { course: d.course, situation: d.situation, source: 'profile' } : null);
  const combo = {
    allowCustom: true,
    customLabel: (text: string) => t('studyProfile.combo.custom', { text }),
    emptyLabel: t('studyProfile.combo.empty'),
    moreLabel: (n: number) => t('studyProfile.combo.more', { n }),
    clearAriaLabel: t('studyProfile.combo.clear'),
    loadingLabel: t('studyProfile.combo.loading'),
    disabled,
  };
  const name = courseName(d);
  const place = d.city ? `${d.city}${d.uf ? `, ${d.uf}` : ''}` : '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span id={`${id}-sit`} className="font-bold text-ink">{t('studyProfile.situation.label')}</span>
        <ChoiceChip
          label={t('studyProfile.situation.label')}
          options={studySituations.map((s) => ({ value: s, label: t(`studyProfile.situation.${s}`) }))}
          value={d.situation}
          onValueChange={(s) => onChange({ ...d, situation: s as StudyDraft['situation'] })}
        />
        <Err id={`${id}-sit-err`}>{errors.situation}</Err>
      </div>

      <div className="flex flex-col gap-2">
        <Autocomplete
          label={t('studyProfile.course.label')}
          placeholder={t('studyProfile.course.placeholder')}
          options={courses.map(courseOption)}
          value={d.course ? { value: d.course, label: name || d.courseLabel } : null}
          onValueChange={pickCourse}
          error={errors.course}
          {...combo}
        />
        <p className={help}>{t('studyProfile.course.helpAreas')}</p>
      </div>

      {show.council || d.autoGoal ? (
        <div role="status" className={autoBox}>
          <span className="text-xs font-extrabold uppercase tracking-[.08em]">{t('studyProfile.auto.title')}</span>
          {d.council ? <span>{t('studyProfile.auto.council', { council: `${d.council} · ${t(`studyProfile.councils.${d.council}`)}` })}</span> : null}
          {d.autoGoal ? (
            <span className="flex flex-wrap items-center gap-2">
              {t('studyProfile.auto.goal', { goal: goalName(d.autoGoal) })}
              <button type="button" disabled={disabled} onClick={() => onChange(undoAutoGoal(d))} className="inline-flex min-h-11 items-center font-bold text-primary-deep underline">
                {t('studyProfile.auto.undo')}
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {show.courseOther ? (
        <div className="flex flex-col gap-2">
          <Input label={t('studyProfile.course.otherLabel')} value={d.courseOtherText} maxLength={STUDY_PROFILE_LIMITS.courseOther} disabled={disabled} onChange={(e) => onChange({ ...d, courseOtherText: e.target.value })} aria-invalid={!!errors.courseOther} aria-describedby={errors.courseOther ? `${id}-other-err` : undefined} />
          <Err id={`${id}-other-err`}>{errors.courseOther}</Err>
        </div>
      ) : null}

      {show.nonHealthTopic ? (
        <div className="flex flex-col gap-2">
          <Input label={t('studyProfile.course.nonHealthLabel')} value={d.nonHealthTopic} maxLength={STUDY_PROFILE_LIMITS.nonHealthTopic} disabled={disabled} onChange={(e) => onChange({ ...d, nonHealthTopic: e.target.value })} aria-invalid={!!errors.nonHealth} aria-describedby={`${id}-nh-help`} />
          <p id={`${id}-nh-help`} className={help}>{t('studyProfile.course.nonHealthHelp')}</p>
          <Err id={`${id}-nh-err`}>{errors.nonHealth}</Err>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Autocomplete
          label={t(d.situation === 'profissional' ? 'studyProfile.institution.labelGraduated' : 'studyProfile.institution.label')}
          placeholder={t('studyProfile.institution.placeholder')}
          loadOptions={loadInstitutions}
          minChars={0}
          value={d.institution ? { value: d.institution.id, label: instLabel(d.institution) } : d.institutionText ? { value: null, label: d.institutionText, custom: true } : null}
          onValueChange={pickInstitution}
          {...combo}
        />
        <p className={help}>{t('studyProfile.institution.help')}</p>
        {d.institution ? (
          <div role="status" className={autoBox}>
            <span className="text-xs font-extrabold uppercase tracking-[.08em]">{t('studyProfile.auto.title')}</span>
            <span>{place} · {t(`studyProfile.institution.${d.institution.type}`)}</span>
          </div>
        ) : null}
        {show.institutionCustom ? (
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <Input label={t('studyProfile.institution.city')} autoComplete="address-level2" value={d.city} maxLength={STUDY_PROFILE_LIMITS.city} disabled={disabled} onChange={(e) => onChange({ ...d, city: e.target.value })} aria-invalid={!!errors.city} />
            <Input label={t('studyProfile.institution.uf')} autoComplete="address-level1" value={d.uf} maxLength={2} disabled={disabled} onChange={(e) => onChange({ ...d, uf: e.target.value.toUpperCase().slice(0, 2) })} aria-invalid={!!errors.uf} />
            <div className="col-span-2 flex flex-col gap-1">
              <Err id={`${id}-city-err`}>{errors.city}</Err>
              <Err id={`${id}-uf-err`}>{errors.uf}</Err>
            </div>
          </div>
        ) : null}
      </div>

      {show.period ? (
        <div className="flex flex-col gap-2">
          <span className="font-bold text-ink">{t('studyProfile.period.label')}</span>
          <span className="self-start">
            <NumberStepper label={t('studyProfile.period.label')} value={d.period} min={1} max={12} unit={t('studyProfile.period.unit')} decLabel={t('studyProfile.period.dec')} incLabel={t('studyProfile.period.inc')} onChange={(n) => onChange({ ...d, period: n })} />
          </span>
        </div>
      ) : null}

      {show.councilNumber && askCouncilNumber ? (
        <div className="flex flex-col gap-2">
          <Input label={t('studyProfile.council.numberLabel')} value={d.councilNumber} maxLength={STUDY_PROFILE_LIMITS.councilNumber} autoComplete="off" disabled={disabled} onChange={(e) => onChange({ ...d, councilNumber: e.target.value })} aria-invalid={!!errors.councilNumber} aria-describedby={`${id}-reg-help`} />
          <p id={`${id}-reg-help`} className={help}>{t('studyProfile.council.numberHelp')}</p>
          <Err id={`${id}-reg-err`}>{errors.councilNumber}</Err>
        </div>
      ) : null}

      <div role="group" aria-labelledby={`${id}-goals`} aria-describedby={`${id}-goals-help`} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span id={`${id}-goals`} className="font-bold text-ink">{t('studyProfile.goals.label')}</span>
          <span aria-live="polite" className="shrink-0 text-[13px] font-bold text-muted">{t('studyProfile.goals.count', { n: goalCount, max: MAX_GOALS })}</span>
        </div>
        <p id={`${id}-goals-help`} className={help}>{t(goalCount >= MAX_GOALS ? 'studyProfile.goals.full' : 'studyProfile.goals.help', { max: MAX_GOALS })}</p>
        {goalGroups.map((g) => (
          <div key={g.key} className="flex flex-col gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[.08em] text-muted">{g.title}</span>
            <ChoiceChipMulti label={g.title} options={g.options} values={goalValues} full={goalCount >= MAX_GOALS} onValuesChange={setGoals} />
          </div>
        ))}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={t('studyProfile.goals.otherLabel')}
              placeholder={t('studyProfile.goals.otherPlaceholder')}
              value={otherGoal}
              maxLength={STUDY_PROFILE_LIMITS.customGoal}
              disabled={disabled || goalCount >= MAX_GOALS}
              onChange={(e) => setOtherGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOtherGoal(); } }}
            />
          </div>
          <Button type="button" variant="secondary" disabled={disabled || !canAddOther} onClick={addOtherGoal}>{t('studyProfile.goals.add')}</Button>
        </div>
        <Err id={`${id}-goals-err`}>{errors.goals}</Err>
        <p className={help}>{t(caps.needsConfirmation ? 'studyProfile.menuNote.none' : caps.showEnamed ? 'studyProfile.menuNote.enamed' : 'studyProfile.menuNote.course')}</p>
      </div>
    </div>
  );
}
