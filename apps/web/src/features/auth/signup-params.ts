import { healthCourseCodes, type HealthCourseCode } from '@remoa/contracts';

/** Landing `signupHref` contract: `founder` = founder_lifetime on /app/planos (the founder offer lives there). Free sends no plano. */
export const signupPlans = ['pro_monthly', 'pro_annual', 'founder'] as const;
export type SignupPlan = (typeof signupPlans)[number];
const has = <T extends string>(list: readonly T[], v?: string): v is T => !!v && (list as readonly string[]).includes(v);

/** F35 FR-8 / F28: `?plano=` and `?curso=` (health course code); anything else is dropped (no plan box). */
export const signupParams = (q: { plano?: string; curso?: string }): { plan?: SignupPlan; course?: HealthCourseCode } => ({
  ...(has(signupPlans, q.plano) ? { plan: q.plano } : {}),
  ...(has(healthCourseCodes, q.curso) ? { course: q.curso } : {}),
});

/** Where checkout continues for the chosen plan (the plans page opens on its period). */
export const planHref = (plan: SignupPlan) => (plan === 'pro_annual' ? '/app/planos?periodo=anual' : '/app/planos');
