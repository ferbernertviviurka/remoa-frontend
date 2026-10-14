import { cookies } from 'next/headers';
import { REFERRAL_COOKIE } from '@remoa/contracts/constants';
import { SignUpWizard } from '@/features/auth/sign-up-wizard';
import { signupParams } from '@/features/auth/signup-params';

type Search = { next?: string; plano?: string; curso?: string; de?: string };

/** F35 FR-8 (contract with the Landing): /cadastro?plano=<planId>&curso=<courseCode>&de=landing. Unknown values are ignored. */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const referred = !!(await cookies()).get(REFERRAL_COOKIE);
  return <SignUpWizard next={q.next} referred={referred} {...signupParams(q)} />;
}
