import type { HealthCourse, Institution, StudyGoal, StudyProfile } from '@remoa/contracts';

/** Test data (shapes of GET /v1/public/reference/*). */
export const COURSES: HealthCourse[] = [
  { code: 'medicine', name: 'Medicina', aliases: ['medico'], kind: 'course', councilCode: 'CRM', suggestedGoals: ['enamed', 'residencia_medica'] },
  { code: 'nursing', name: 'Enfermagem', aliases: ['enfermeiro'], kind: 'course', councilCode: 'COREN', suggestedGoals: ['provas_faculdade', 'concursos_saude'] },
  { code: 'pharmacy', name: 'Farmácia', aliases: ['farmaceutico'], kind: 'course', councilCode: 'CRF', suggestedGoals: ['residencia_multiprofissional'] },
  { code: 'nursing_technician', name: 'Técnico(a) em Enfermagem', aliases: ['tecnico'], kind: 'course', councilCode: 'COREN', suggestedGoals: ['provas_curso'] },
  { code: 'public_health', name: 'Saúde Coletiva', aliases: ['sanitarista'], kind: 'course', councilCode: null, suggestedGoals: [] },
  { code: 'other_health', name: 'Outro curso da saúde', aliases: ['outro'], kind: 'other_health', councilCode: null, suggestedGoals: ['provas_faculdade'] },
  { code: 'not_health', name: 'Não é da área da saúde', aliases: ['direito'], kind: 'not_health', councilCode: null, suggestedGoals: ['idiomas'] },
];
export const GOALS: StudyGoal[] = [
  { code: 'enamed', name: 'ENAMED', courseCodes: ['medicine'] },
  { code: 'residencia_medica', name: 'Residência médica', courseCodes: ['medicine'] },
  { code: 'provas_faculdade', name: 'Provas da faculdade', courseCodes: null },
  { code: 'concursos_saude', name: 'Concursos públicos da saúde', courseCodes: null },
  { code: 'residencia_multiprofissional', name: 'Residência multiprofissional em saúde', courseCodes: null },
  { code: 'idiomas', name: 'Idiomas', courseCodes: null },
];
export const goalsFor = (course?: string | null) => GOALS.filter((g) => !course || !g.courseCodes || g.courseCodes.includes(course as never));
export const UFPR: Institution = { id: '00000000-0000-4000-8000-000000000001', name: 'Universidade Federal do Paraná', acronym: 'UFPR', city: 'Curitiba', uf: 'PR', type: 'public' };
export const profileFixture = (p: Partial<StudyProfile> = {}): StudyProfile => ({
  situation: 'graduacao', course: 'nursing', courseOtherText: null, institution: UFPR, institutionText: null, city: 'Curitiba', uf: 'PR', institutionType: 'public',
  period: 5, goals: ['provas_faculdade'], customGoals: [], councilNumber: null, nonHealthTopic: null, source: 'signup', updatedAt: '2026-10-13T12:00:00.000Z', ...p,
});
