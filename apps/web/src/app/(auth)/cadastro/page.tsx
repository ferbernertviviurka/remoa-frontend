import { cookies } from 'next/headers';
import { healthCourseCodes, type HealthCourseCode } from '@remoa/contracts';
import { REFERRAL_COOKIE } from '@remoa/contracts/constants';
import { SignUpWizard } from '@/features/auth/sign-up-wizard';
import { isSignupPlan } from '@/features/auth/signup-params';

type Search = { next?: string; plano?: string; curso?: string; de?: string };
const isCourse = (v?: string): v is HealthCourseCode => !!v && (healthCourseCodes as readonly string[]).includes(v);

/** F35 FR-8 (contract with the Landing): /cadastro?curso=<courseCode>&de=landing[&plano=pro_monthly|pro_annual|founder]. Unknown values are ignored. */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const referred = !!(await cookies()).get(REFERRAL_COOKIE);
  return <SignUpWizard next={q.next} referred={referred} plan={isSignupPlan(q.plano) ? q.plano : undefined} course={isCourse(q.curso) ? q.curso : undefined} />;
}
