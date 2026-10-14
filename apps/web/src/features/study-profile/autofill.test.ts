import { describe, expect, it } from 'vitest';
import {
  applyCourse, applyInstitution, courseName, emptyDraft, focusTitle, fromProfile, newSuggestions, studyCompleteness, toInput, toggleGoal, undoAutoGoal, visibleFields,
  type StudyDraft,
} from './autofill';
import { validateDraft } from './validate';
import { COURSES, UFPR, profileFixture } from './fixtures';

const c = (code: string) => COURSES.find((x) => x.code === code)!;
const draft = (p: Partial<StudyDraft> = {}): StudyDraft => ({ ...emptyDraft, ...p });

describe('applyCourse (FR-18)', () => {
  it('fills the council and adds the first suggested goal as automatic', () => {
    const d = applyCourse(emptyDraft, c('nursing'));
    expect(d).toMatchObject({ course: 'nursing', courseLabel: 'Enfermagem', council: 'COREN', goals: ['provas_faculdade'], autoGoal: 'provas_faculdade' });
  });
  it('switching course replaces only the automatic goal', () => {
    const d = applyCourse(applyCourse(emptyDraft, c('nursing')), c('medicine'));
    expect(d).toMatchObject({ goals: ['enamed'], autoGoal: 'enamed', council: 'CRM' });
  });
  it('never removes goals the user picked, and adds no automatic goal on top of them', () => {
    let d = applyCourse(emptyDraft, c('nursing'));
    d = toggleGoal(d, 'concursos_saude');
    d = applyCourse(d, c('medicine'));
    expect(d.goals).toEqual(['concursos_saude']);
    expect(d.autoGoal).toBeNull();
    expect(applyCourse(draft({ customGoals: ['Prova X'] }), c('nursing')).goals).toEqual([]);
  });
  it('course without council or suggestion: no council, no automatic goal; clearing the course keeps picked goals', () => {
    const d = applyCourse(draft({ councilNumber: '123', goals: ['idiomas'] }), c('public_health'));
    expect(d).toMatchObject({ council: null, councilNumber: '', autoGoal: null, goals: ['idiomas'] });
    expect(applyCourse(d, null)).toMatchObject({ course: null, courseLabel: '', council: null });
  });
  it('typed course becomes other_health with the text; non-health keeps its topic only while selected', () => {
    const d = applyCourse(emptyDraft, c('other_health'), 'Podologia');
    expect(d).toMatchObject({ course: 'other_health', courseOtherText: 'Podologia', courseLabel: 'Podologia' });
    expect(courseName(d)).toBe('Podologia');
    expect(applyCourse(draft({ courseOtherText: 'X' }), c('other_health')).courseOtherText).toBe('X'); // picked from the list: keeps what was typed
    const nh = applyCourse(draft({ nonHealthTopic: 'Direito' }), c('not_health'));
    expect(nh.nonHealthTopic).toBe('Direito');
    expect(applyCourse(nh, c('nursing')).nonHealthTopic).toBe('');
  });
});

describe('goals', () => {
  it('Desfazer removes the automatic goal; removing it by hand clears the mark; adding keeps it', () => {
    const d = applyCourse(emptyDraft, c('nursing'));
    expect(undoAutoGoal(d)).toMatchObject({ goals: [], autoGoal: null });
    expect(toggleGoal(d, 'provas_faculdade')).toMatchObject({ goals: [], autoGoal: null });
    expect(toggleGoal(d, 'idiomas')).toMatchObject({ goals: ['provas_faculdade', 'idiomas'], autoGoal: 'provas_faculdade' });
    expect(toggleGoal(toggleGoal(d, 'idiomas'), 'idiomas').goals).toEqual(['provas_faculdade']);
  });
});

describe('applyInstitution (FR-19)', () => {
  it('list pick fills city/UF; typed text clears them; null clears all', () => {
    const d = applyInstitution(emptyDraft, { institution: UFPR });
    expect(d).toMatchObject({ institution: UFPR, city: 'Curitiba', uf: 'PR', institutionText: '' });
    const typed = applyInstitution(d, { text: 'Faculdade Nova' });
    expect(typed).toMatchObject({ institution: null, institutionText: 'Faculdade Nova', city: '', uf: '' });
    expect(visibleFields(typed).institutionCustom).toBe(true);
    expect(applyInstitution(typed, null)).toMatchObject({ institution: null, institutionText: '' });
  });
});

describe('visibleFields and focusTitle (FR-20, FR-21, FR-22)', () => {
  it.each([
    [{ situation: 'graduacao', course: 'nursing', period: 5 }, 'Estudante de Enfermagem · 5º período'],
    [{ situation: 'graduacao', course: 'other_health', courseOtherText: 'Podologia' }, 'Estudante de Podologia'],
    [{ situation: 'residente', course: 'pharmacy' }, 'Residente ou pós-graduando em Farmácia'],
    [{ situation: 'profissional', course: 'nursing' }, 'Enfermagem · profissional formado(a)'],
    [{ situation: 'preparando', course: 'medicine' }, 'Preparando prova · Medicina'],
    [{ course: 'not_health', nonHealthTopic: 'Direito' }, 'Estudo fora da área da saúde: Direito'],
    [{ course: 'not_health' }, 'Estudo fora da área da saúde'],
    [{}, 'Conte o que você estuda'],
  ] as const)('%o -> %s', (p, title) => {
    const base = 'course' in p ? applyCourse(emptyDraft, c(p.course)) : emptyDraft;
    expect(focusTitle({ ...base, ...p } as StudyDraft)).toBe(title);
  });
  it('period only for graduação in a health course; council number only for profissional with a council', () => {
    expect(visibleFields({ situation: 'graduacao', course: 'nursing', council: 'COREN', institutionText: '' })).toMatchObject({ period: true, councilNumber: false, council: true });
    expect(visibleFields({ situation: 'graduacao', course: 'not_health', council: null, institutionText: '' })).toMatchObject({ period: false, nonHealthTopic: true, council: false });
    expect(visibleFields({ situation: 'profissional', course: 'nursing', council: 'COREN', institutionText: '' })).toMatchObject({ period: false, councilNumber: true });
    expect(visibleFields({ situation: 'profissional', course: 'public_health', council: null, institutionText: '' }).councilNumber).toBe(false);
  });
});

describe('toInput / validateDraft (FR-9)', () => {
  it('requires a course and a goal', () => {
    expect(validateDraft(emptyDraft).errors).toEqual({ course: 'Escolha o seu curso.', goals: 'Escolha pelo menos um foco de estudo.' });
    expect(validateDraft(draft({ goals: ['idiomas'] })).errors).toEqual({ course: 'Escolha o seu curso.' });
    expect(validateDraft(undoAutoGoal(applyCourse(emptyDraft, c('nursing')))).errors).toEqual({ goals: 'Escolha pelo menos um foco de estudo.' });
  });
  it('drops hidden fields and keeps the visible ones', () => {
    let d = applyCourse(draft({ situation: 'profissional', councilNumber: '12345', period: 7 }), c('nursing'));
    d = applyInstitution(d, { institution: UFPR });
    const { input, errors } = validateDraft(d, 'signup');
    expect(errors).toEqual({});
    expect(input).toMatchObject({ situation: 'profissional', course: 'nursing', institutionId: UFPR.id, institutionText: null, city: null, uf: null, period: null, councilNumber: '12345', goals: ['provas_faculdade'], context: 'signup' });
    expect(toInput({ ...d, situation: 'graduacao' }).councilNumber).toBeNull();
    expect(toInput({ ...d, situation: 'graduacao' }).period).toBe(7);
  });
  it('maps contract issues to field messages', () => {
    expect(validateDraft(applyCourse(emptyDraft, c('other_health'))).errors.courseOther).toBe('Escreva o nome do seu curso.');
    expect(validateDraft(applyCourse(emptyDraft, c('not_health'))).errors.nonHealth).toBe('Conte o que você estuda.');
    const typed = applyInstitution(applyCourse(emptyDraft, c('nursing')), { text: 'Faculdade Nova' });
    expect(validateDraft({ ...typed, city: 'Curitiba', uf: 'XX' }).errors.uf).toBe('Use a sigla do estado, como SP.');
    expect(validateDraft({ ...typed, city: 'Curitiba', uf: 'pr' }).input).toMatchObject({ institutionText: 'Faculdade Nova', city: 'Curitiba', uf: 'PR' });
    expect(validateDraft({ ...typed, situation: 'profissional', councilNumber: '12#3' }).errors.councilNumber).toBe('Use só letras, números, ponto, barra ou hífen.');
  });
});

describe('fromProfile, suggestions, completeness', () => {
  it('maps a saved profile (and null) to the form', () => {
    expect(fromProfile(null, COURSES)).toBe(emptyDraft);
    expect(fromProfile(profileFixture(), COURSES)).toMatchObject({ course: 'nursing', courseLabel: 'Enfermagem', council: 'COREN', institution: UFPR, city: 'Curitiba', period: 5 });
    expect(fromProfile(profileFixture({ course: 'other_health', courseOtherText: 'Podologia', institution: null, institutionText: 'Fac', city: null, uf: null, period: null, situation: null }), [])).toMatchObject({
      courseLabel: 'Podologia', council: null, institutionText: 'Fac', city: '', period: 1, situation: 'graduacao',
    });
    expect(fromProfile(profileFixture({ course: 'pharmacy' }), []).courseLabel).toBe('pharmacy');
  });
  it('only new free texts go to curation', () => {
    const input = toInput({ ...applyCourse(emptyDraft, c('other_health'), 'Podologia'), institutionText: 'Fac', city: 'X', customGoals: ['Prova A', 'Prova B'] });
    expect(newSuggestions(input, null)).toEqual([
      { kind: 'course', text: 'Podologia' }, { kind: 'institution', text: 'Fac' }, { kind: 'goal', text: 'Prova A' }, { kind: 'goal', text: 'Prova B' },
    ]);
    expect(newSuggestions(input, profileFixture({ courseOtherText: 'Podologia', institutionText: 'Fac', customGoals: ['Prova A'] }))).toEqual([{ kind: 'goal', text: 'Prova B' }]);
  });
  it('completeness: situation, course, institution, focus', () => {
    expect(studyCompleteness(null)).toBe(0);
    expect(studyCompleteness(profileFixture())).toBe(100);
    expect(studyCompleteness(profileFixture({ institution: null, goals: [] }))).toBe(50);
    expect(studyCompleteness(profileFixture({ institution: null, institutionText: 'Fac', goals: [], customGoals: ['X'] }))).toBe(100);
  });
});
