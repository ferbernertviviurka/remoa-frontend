import { cookies } from 'next/headers';
import { REFERRAL_COOKIE } from '@remoa/contracts/constants';
import { SignUpWizard } from '@/features/auth/sign-up-wizard';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const referred = !!(await cookies()).get(REFERRAL_COOKIE);
  return <SignUpWizard next={next} referred={referred} />;
}
