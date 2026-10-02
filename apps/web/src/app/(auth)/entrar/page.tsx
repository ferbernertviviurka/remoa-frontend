import { SignInForm } from '@/features/auth/sign-in-form';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SignInForm next={next} />;
}
