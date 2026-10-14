/** Landing `signupHref` contract: `founder` = the founder offer on /app/planos. Free sends no plano. Zod-free: the wizard imports it. */
export const signupPlans = ['pro_monthly', 'pro_annual', 'founder'] as const;
export type SignupPlan = (typeof signupPlans)[number];
export const isSignupPlan = (v?: string): v is SignupPlan => !!v && (signupPlans as readonly string[]).includes(v);

/** Where checkout continues for the chosen plan (the plans page opens on its period). */
export const planHref = (plan: SignupPlan) => (plan === 'pro_annual' ? '/app/planos?periodo=anual' : '/app/planos');
