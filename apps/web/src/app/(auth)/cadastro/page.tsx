import { SignUpWizard } from '@/features/auth/sign-up-wizard';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SignUpWizard next={next} />;
}
